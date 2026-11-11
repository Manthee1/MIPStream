/** @format */

import { h, toRaw } from "vue";
import { NButton, useDialog, useMessage } from "naive-ui";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/UIStore";
import { getActiveDesigner, requestArchitectureSnapshot } from "../editor/core/designer-bridge";
import { bumpDocumentRevision } from "../editor/core/selection-bridge";
import { serializeArchitecture } from "../shared/serialization";
import { ensureConfiguration } from "../config/default-configuration";
import {
  getArchitectureTemplates,
  insertArchitectureTemplate,
  newTemplateId,
  replaceAllArchitectureTemplates,
} from "../services/architectureTemplatesService";
import { buildArchitectureBundle, validateArchitectureBundle } from "../shared/utils/architecture-bundle";
import { downloadJsonFile, pickTextFile, toFileStem } from "../shared/utils/file-io";
import type { ArchitectureConfig } from "../shared/types/architecture";
import type { ArchitectureExportBundle } from "../shared/types/architecture-template";

/** File extension of the single-file architecture export. */
const ARCHITECTURE_FILE_EXTENSION = '.miparch';

/**
 * Architecture transfer flows (todo: architecture import/export/"save as
 * template"): saving the current architecture as a reusable template,
 * exporting it bundled with the whole user template library as one file, and
 * importing such a file back — replacing the current project's architecture
 * in place and restoring the template table to its exported state.
 *
 * Exports snapshot the LIVE schematic document (same seam as project save)
 * but deliberately never dirty the project; imports are real mutations: the
 * project is marked unsaved and the compiled simulation is invalidated.
 */
export function useArchitectureTransfer() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const message = useMessage();
  const dialog = useDialog();

  /**
   * Detached copy of the current architecture: the live designer document
   * when a canvas is mounted (so files never lag behind unsaved edits), the
   * stored architecture otherwise. Read-only — the project stays clean.
   */
  function liveArchitecture(): ArchitectureConfig | null {
    const stored = toRaw(projectStore.currentProject ?? null)?.architecture;
    if (!stored) return null;
    const snapshot = requestArchitectureSnapshot();
    if (!snapshot) return JSON.parse(JSON.stringify(stored)) as ArchitectureConfig;
    return serializeArchitecture(
      stored.name,
      stored.description,
      snapshot.modules,
      snapshot.nets,
      stored.configuration
    );
  }

  /** Opens the Save-as-Template modal over the live document. */
  function openSaveAsTemplate(): void {
    if (!projectStore.currentProject) {
      message.warning('No project is loaded.');
      return;
    }
    uiStore.showSaveTemplateModal = true;
  }

  /** Stores the current architecture as a user template. */
  async function saveAsTemplate(name: string, description: string): Promise<boolean> {
    const architecture = liveArchitecture();
    if (!architecture) return false;
    try {
      await insertArchitectureTemplate({
        id: newTemplateId(),
        name,
        description,
        icon: 'IconCpu',
        architecture,
      });
      message.success(`Template "${name}" saved.`);
      return true;
    } catch (error) {
      message.error('Failed to save the template: ' + (error as Error).message);
      return false;
    }
  }

  /**
   * Downloads a single `.miparch` file containing the current architecture
   * plus a full snapshot of the user template table.
   */
  async function exportArchitecture(): Promise<void> {
    const project = projectStore.currentProject;
    if (!project) {
      message.warning('No project is loaded.');
      return;
    }
    try {
      const architecture = liveArchitecture();
      if (!architecture) return;
      const templates = await getArchitectureTemplates();
      const bundle = buildArchitectureBundle(architecture, templates);
      const stem = toFileStem(architecture.name || project.name);
      downloadJsonFile(`${stem}${ARCHITECTURE_FILE_EXTENSION}`, bundle);
      const suffix = templates.length > 0
        ? ` — includes ${templates.length} template${templates.length === 1 ? '' : 's'}`
        : '';
      message.success(`Exported "${architecture.name}"${suffix}.`);
    } catch (error) {
      message.error('Failed to export the architecture: ' + (error as Error).message);
    }
  }

  /** Import confirmation — both restore effects are named before applying. */
  function confirmImport(bundle: ArchitectureExportBundle): Promise<boolean> {
    const currentName = projectStore.currentProject?.architecture?.name || 'the current architecture';
    const templateNote = bundle.templates.length > 0
      ? `Your template library will be replaced with the ${bundle.templates.length} template(s) from this file.`
      : 'Your template library will be emptied (this file contains no templates).';
    const content =
      `Replace "${currentName}" with the imported architecture "${bundle.architecture.name}"? ` +
      templateNote +
      ' The change applies immediately but is not saved until you save the project.';

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        reactive?.destroy();
        resolve(ok);
      };
      const reactive = dialog.warning({
        title: 'Import architecture?',
        content,
        action: () =>
          h('div', { class: 'flex w-full items-center justify-end gap-2' }, [
            h(NButton, { size: 'small', onClick: () => finish(false) }, { default: () => 'Cancel' }),
            h(NButton, { size: 'small', type: 'primary', onClick: () => finish(true) }, { default: () => 'Import' }),
          ]),
        onClose: () => finish(false),
        onAfterLeave: () => finish(false),
      });
    });
  }

  /**
   * Applies an imported architecture to the current project: through the live
   * designer when a canvas is mounted (document replaced, revision bumped,
   * project marked unsaved via the designer's commit seam), store-only
   * otherwise. Returns the designer's per-element skip warnings (empty on
   * the store-only path).
   */
  function applyImportedArchitecture(architecture: ArchitectureConfig): string[] {
    const modules = JSON.parse(JSON.stringify(architecture.modules ?? []));
    const nets = JSON.parse(JSON.stringify(architecture.nets ?? []));

    projectStore.updateArchitecture((current) => {
      current.name = architecture.name;
      current.description = architecture.description;
      current.configuration = ensureConfiguration(architecture.configuration);
      current.modules = modules;
      current.nets = nets;
    });

    const designer = getActiveDesigner();
    if (designer) {
      return designer.replaceArchitecture({ modules, nets });
    }
    // No canvas mounted (Simulate perspective): invalidate the compiled
    // session manually — it compiles from the store's fallback document.
    bumpDocumentRevision();
    return [];
  }

  /**
   * Picks a `.miparch` file, validates it, and — after confirmation —
   * restores both of its payloads: the architecture into the current project
   * and the template table to its exported state.
   */
  async function importArchitecture(): Promise<void> {
    if (!projectStore.currentProject) {
      message.warning('Open a project before importing an architecture.');
      return;
    }

    const text = await pickTextFile(`${ARCHITECTURE_FILE_EXTENSION},application/json`);
    if (text === null) return; // Picker cancelled.

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      message.error('The selected file is not valid JSON.');
      return;
    }

    const { bundle, errors, warnings } = validateArchitectureBundle(parsed);
    if (!bundle) {
      message.error(errors[0] ?? 'The file is not a valid architecture export.');
      return;
    }
    if (!(await confirmImport(bundle))) return;

    try {
      await replaceAllArchitectureTemplates(bundle.templates);
      const loadWarnings = applyImportedArchitecture(bundle.architecture);
      message.success(`Imported architecture "${bundle.architecture.name}".`);
      const firstWarning = warnings[0] ?? loadWarnings[0];
      if (firstWarning) message.warning(firstWarning, { duration: 6000 });
    } catch (error) {
      message.error('Failed to import the architecture: ' + (error as Error).message);
    }
  }

  return { openSaveAsTemplate, saveAsTemplate, exportArchitecture, importArchitecture };
}

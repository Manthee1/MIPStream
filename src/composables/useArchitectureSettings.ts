/** @format */

import { computed, ref, watch } from "vue";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/UIStore";
import type { ArchitectureConfiguration } from "../shared/types/architecture";
import { ensureConfiguration } from "../config/default-configuration";
import { isaWarnings } from "../shared/utils/isa-validation";
import { pipelineWarnings } from "../shared/utils/pipeline-stages";
import { boundaryId, planStageRegisterSync, stageRegisterConfig } from "../shared/utils/stage-registers";
import { getActiveDesigner } from "../editor/core/designer-bridge";

/**
 * Draft-commit flow for the architecture settings modal: the draft is a deep
 * clone of the project's live configuration that only lands in the project
 * store (and marks it unsaved) when the user confirms.
 */
export function useArchitectureSettings() {
  const projectStore = useProjectStore();
  const uiStore = useUIStore();

  const show = computed({
    get: () => uiStore.showArchitectureSettings,
    set: (value: boolean) => (value ? uiStore.openArchitectureSettings() : uiStore.closeArchitectureSettings()),
  });

  const draft = ref<ArchitectureConfiguration | null>(null);

  // A fresh draft is taken every time the modal opens.
  watch(
    () => uiStore.showArchitectureSettings,
    (open) => {
      if (open && projectStore.currentProject) {
        // Deep clone: draft edits must never leak into the live project.
        draft.value = ensureConfiguration(
          JSON.parse(JSON.stringify(projectStore.currentProject.architecture.configuration ?? {}))
        );
      } else {
        draft.value = null;
      }
    }
  );

  /** Commits the draft into the project store and closes the modal. */
  function commit(): void {
    if (!draft.value || !projectStore.currentProject) return;

    projectStore.updateArchitecture((architecture) => {
      architecture.configuration = draft.value as ArchitectureConfiguration;

      const designer = getActiveDesigner();
      const stageModules = designer ? designer.getSerializedModules() : architecture.modules;
      const plan = planStageRegisterSync(stageModules, draft.value!.pipeline.stages);

      for (const designator of plan.remove) {
        if (designer) {
          designer.removeModule(designator);
        } else {
          architecture.modules = architecture.modules.filter((module) => module.designator !== designator);
        }
      }

      for (const { designator, stageId, stageIndex } of plan.relabel) {
        const target = designer
          ? designer.getModule(designator)
          : architecture.modules.find((module) => module.designator === designator);
        if (!target) continue;
        if (designer) {
          designer.setModuleConfig(designator, { ...(target.config ?? {}), stageId, stageIndex, managed: true });
        } else {
          target.config = { ...(target.config ?? {}), stageId, stageIndex, managed: true };
        }
      }

      for (const index of plan.create) {
        const patch = stageRegisterConfig(draft.value!.pipeline.stages, index);
        const position = { x: 80 + (index * 130), y: 80 + (index % 2) * 80 };

        if (designer) {
          const designator = designer.addModule("std.register", position, 0);
          if (designator) {
            designer.setModuleConfig(designator, { ...patch, managed: true, stageId: boundaryId(draft.value!.pipeline.stages, index) });
          }
        } else {
          architecture.modules.push({
            designator: `stage-reg-${index}-${Date.now()}`,
            typeId: "std.register",
            position,
            rotation: 0,
            config: { ...patch, managed: true, stageId: boundaryId(draft.value!.pipeline.stages, index) },
          });
        }
      }
    });
    uiStore.closeArchitectureSettings();
  }

  const warnings = computed<string[]>(() => {
    if (!draft.value) return [];
    return [
      ...pipelineWarnings(draft.value.pipeline.stages, draft.value.pipeline.startStageBoundary),
      ...isaWarnings(draft.value.isa),
    ];
  });

  return { show, draft, warnings, commit };
}

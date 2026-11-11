/** @format */

import { getManifest } from "../manifestRegistry";
import {
  ARCHITECTURE_BUNDLE_FORMAT,
  ARCHITECTURE_BUNDLE_VERSION,
  type ArchitectureExportBundle,
  type ArchitectureTemplate,
} from "../types/architecture-template";
import type { ArchitectureConfig } from "../types/architecture";

/**
 * Build/validate logic for the single-file architecture export
 * (`mipstream-architecture-bundle`, see shared/types/architecture-template.ts).
 * Pure JSON in/out — normalization of the configuration shape
 * (`ensureConfiguration`) deliberately stays at the apply site (the
 * composables), keeping this util free of a shared → config dependency.
 */

/** Result of parsing a candidate export file. */
export interface BundleValidationResult {
  bundle: ArchitectureExportBundle | null;
  errors: string[];
  warnings: string[];
}

/** Deep JSON clone — detaches Vue reactive proxies and file-parse objects. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Assembles an export bundle over deep clones of its inputs. */
export function buildArchitectureBundle(
  architecture: ArchitectureConfig,
  templates: ArchitectureTemplate[]
): ArchitectureExportBundle {
  return {
    format: ARCHITECTURE_BUNDLE_FORMAT,
    version: ARCHITECTURE_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    architecture: clone(architecture),
    templates: clone(templates),
  };
}

/** Coerces a JSON value into a Date instance (fallback: now). */
function toDate(value: unknown): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Light structural validation of one architecture payload. Returns null when
 * the shape is unusable; drops individual malformed entries with warnings
 * instead (the designer's load skips-and-warns the same way). Unknown module
 * typeIds are warnings, not errors — the app may simply lack a custom module.
 */
function validateArchitecture(
  value: unknown,
  warnings: string[],
  label: string
): ArchitectureConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.modules)) return null;
  if (!Array.isArray(record.nets)) return null;

  const modules = record.modules.filter((entry): boolean => {
    const usable = !!entry && typeof entry === 'object' &&
      typeof (entry as Record<string, unknown>).designator === 'string' &&
      typeof (entry as Record<string, unknown>).typeId === 'string';
    if (!usable) warnings.push(`${label}: skipped a malformed module entry.`);
    return usable;
  });
  for (const entry of modules) {
    const typeId = (entry as Record<string, unknown>).typeId as string;
    if (!getManifest(typeId)) {
      warnings.push(`${label}: module type "${typeId}" is unknown to this app — it will be skipped on load.`);
    }
  }

  const nets = record.nets.filter((entry): boolean => {
    const usable = !!entry && typeof entry === 'object';
    if (!usable) warnings.push(`${label}: skipped a malformed net entry.`);
    return usable;
  });

  return {
    name: typeof record.name === 'string' ? record.name : '',
    description: typeof record.description === 'string' ? record.description : '',
    modules,
    nets,
    configuration: (record.configuration && typeof record.configuration === 'object'
      ? record.configuration
      : {}) as ArchitectureConfig['configuration'],
  };
}

/** Structural validation of one template entry; null = unusable (warned). */
function validateTemplate(
  value: unknown,
  warnings: string[],
  index: number
): ArchitectureTemplate | null {
  const label = `template #${index + 1}`;
  if (!value || typeof value !== 'object') {
    warnings.push(`Skipped malformed ${label}.`);
    return null;
  }
  const record = value as Record<string, unknown>;
  const architecture = validateArchitecture(record.architecture, warnings, label);
  if (!architecture) {
    warnings.push(`Skipped ${label} — its architecture is malformed.`);
    return null;
  }
  return {
    // A hand-edited bundle may lack ids/dates; regenerate them so the row is
    // always insertable.
    id: typeof record.id === 'string' && record.id
      ? record.id
      : `tpl-${Date.now().toString(36)}-${index}`,
    name: typeof record.name === 'string' && record.name ? record.name : 'Untitled template',
    description: typeof record.description === 'string' ? record.description : '',
    icon: typeof record.icon === 'string' && record.icon ? record.icon : 'IconCpu',
    architecture,
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

/**
 * Parses and validates a candidate export file payload. Hard errors (wrong
 * format, newer schema version, unusable architecture) yield a null bundle;
 * soft problems (unknown module types, dropped entries) ride the warnings so
 * the caller can surface them after a successful import.
 */
export function validateArchitectureBundle(raw: unknown): BundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      bundle: null,
      errors: ['The file is not a MIPStream architecture export (expected a JSON object).'],
      warnings,
    };
  }
  const record = raw as Record<string, unknown>;

  if (record.format !== ARCHITECTURE_BUNDLE_FORMAT) {
    errors.push('The file is not a MIPStream architecture export (unknown format).');
  }
  if (typeof record.version !== 'number' || !Number.isFinite(record.version)) {
    errors.push('The export is missing its schema version.');
  } else if (record.version > ARCHITECTURE_BUNDLE_VERSION) {
    errors.push(
      `The export uses schema version ${record.version}, newer than this app supports (${ARCHITECTURE_BUNDLE_VERSION}).`
    );
  }
  if (errors.length > 0) return { bundle: null, errors, warnings };

  const architecture = validateArchitecture(record.architecture, warnings, 'architecture');
  if (!architecture) {
    errors.push('The exported architecture is malformed.');
    return { bundle: null, errors, warnings };
  }

  const templates: ArchitectureTemplate[] = [];
  if (Array.isArray(record.templates)) {
    record.templates.forEach((entry, index) => {
      const template = validateTemplate(entry, warnings, index);
      if (template) templates.push(template);
    });
  } else if (record.templates !== undefined) {
    errors.push('The exported template list is malformed.');
  }

  if (errors.length > 0) return { bundle: null, errors, warnings };

  return {
    bundle: {
      format: ARCHITECTURE_BUNDLE_FORMAT,
      version: record.version as number,
      exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : new Date().toISOString(),
      architecture,
      templates,
    },
    errors,
    warnings,
  };
}


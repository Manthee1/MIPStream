import type { ArchitectureConfig } from "./architecture";

/**
 * A user-made architecture template ("save as template", SIMULATOR_OVERVIEW
 * §1 Templates): the current hardware blueprint frozen for reuse at project
 * creation. Mirrors `ProjectTemplate` (src/config/templates.ts) minus
 * `initialSoftware` — architecture templates carry hardware only, never
 * assembly code.
 *
 * Persisted in its own IndexedDB table (`architecture_templates`, DB v6) and
 * snapshotted wholesale into every architecture export bundle.
 */
export interface ArchitectureTemplate {
    /** Collision-free generated id (`user-<time36>-<rand>`). */
    id: string;
    name: string;
    description: string;
    /** Tabler icon name rendered in the Create Project picker. */
    icon: string;
    architecture: ArchitectureConfig;
    createdAt: Date;
    updatedAt: Date;
}

/** Discriminator of the single-file architecture export format. */
export const ARCHITECTURE_BUNDLE_FORMAT = 'mipstream-architecture-bundle';

/** Current schema version of the export bundle. */
export const ARCHITECTURE_BUNDLE_VERSION = 1;

/**
 * Export bundle: the architecture of one project plus a full snapshot of the
 * user template table at export time. Import restores both to exactly this
 * state — the current project's architecture is replaced in place and the
 * template table is replaced wholesale.
 */
export interface ArchitectureExportBundle {
    format: typeof ARCHITECTURE_BUNDLE_FORMAT;
    version: number;
    exportedAt: string;
    architecture: ArchitectureConfig;
    templates: ArchitectureTemplate[];
}

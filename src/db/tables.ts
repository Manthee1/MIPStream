import { ITable } from "jsstore";

export const projectTableConfig: ITable = {
    name: 'projects',
    columns: {
        id: {
            dataType: 'number',
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            dataType: 'string',
            notNull: true,
        },
        description: {
            dataType: 'string',
            notNull: true,
            default: '',
        },
        software: {
            dataType: 'object',
            notNull: true,
            default: { editors: [] },
        },
        architecture: {
            dataType: 'object',
            notNull: true,
        },
        settings: {
            dataType: 'object',
            notNull: true,
            default: {},
        },
        /**
         * Per-perspective Golden Layout panel arrangements. Nullable: legacy
         * rows (schema v4) have none and fall back to the default layout.
         */
        layouts: {
            dataType: 'object',
        },
        createdAt: {
            dataType: 'date_time',
            notNull: true,
        },
        updatedAt: {
            dataType: 'date_time',
            notNull: true,
        },
    },
}

/**
 * User-made architecture templates ("save as template", DB v6). Each row is a
 * frozen `ArchitectureConfig` reusable at project creation; the whole table
 * is snapshotted into every architecture export and restored wholesale on
 * import. See `src/shared/types/architecture-template.ts`.
 */
export const architectureTemplatesTableConfig: ITable = {
    name: 'architecture_templates',
    columns: {
        id: {
            dataType: 'string',
            primaryKey: true,
        },
        name: {
            dataType: 'string',
            notNull: true,
        },
        description: {
            dataType: 'string',
            notNull: true,
            default: '',
        },
        icon: {
            dataType: 'string',
            notNull: true,
            default: 'IconCpu',
        },
        architecture: {
            dataType: 'object',
            notNull: true,
        },
        createdAt: {
            dataType: 'date_time',
            notNull: true,
        },
        updatedAt: {
            dataType: 'date_time',
            notNull: true,
        },
    },
}



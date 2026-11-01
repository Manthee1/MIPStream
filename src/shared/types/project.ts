import { ArchitectureConfig } from "./architecture";

export interface ProjectEditor {
    id: string;
    name: string;
    sourceCode: string;
}

/**
 * Opaque, JSON-serializable Golden Layout configuration (the persisted
 * `LayoutConfig` shape). Deliberately NOT golden-layout's own type: those
 * recursive interfaces trip TS2589 ("excessively deep") once the Project
 * type travels through Pinia's UnwrapRef. Cast at the load boundary
 * (`reconcileLayoutConfig`) and the store boundary (`handleLayoutChange`).
 */
export type PersistedLayoutConfig = Record<string, unknown>;

/**
 * Golden Layout panel arrangements per perspective (position, size, active
 * tab). Stored in its own `layouts` column so the settings modal and layout
 * writes never touch each other, and so project export can include it
 * explicitly. Layout changes are NOT tracked as unsaved content — they ride
 * targeted column writes or the next full save.
 */
export interface ProjectLayouts {
    design?: PersistedLayoutConfig;
    simulate?: PersistedLayoutConfig;
}

/**
 * Unified Project Model
 * This is the root container for a digital logic / architecture project.
 */
export interface Project {
    id: number;
    name: string;
    description: string;
    
    // Hardware Blueprint
    architecture: ArchitectureConfig;
    
    // Software
    software: {
        editors: ProjectEditor[];
    };
    
    // Meta
    settings: Record<string, any>;
    /** Per-perspective panel arrangements; absent on legacy projects. */
    layouts?: ProjectLayouts;
    createdAt: Date;
    updatedAt: Date;
}

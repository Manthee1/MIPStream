import { ArchitectureConfig } from "./architecture";

export interface ProjectEditor {
    id: string;
    name: string;
    sourceCode: string;
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
    createdAt: Date;
    updatedAt: Date;
}

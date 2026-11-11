import { IOrderQuery } from "jsstore";
import { BaseRepository } from "../db/repository";
import { ArchitectureTemplate } from "../shared/types/architecture-template";

/** Collision-free id for a user-made template (`user-<time36>-<rand>`). */
export function newTemplateId(): string {
    return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class ArchitectureTemplateRepository extends BaseRepository<ArchitectureTemplate> {
    constructor() {
        super('architecture_templates');
    }
}

const templateRepo = new ArchitectureTemplateRepository();

/** Every user-made template, oldest first (stable Create Project ordering). */
export const getArchitectureTemplates = (
    order: IOrderQuery = { by: 'createdAt', type: 'asc' }
) => templateRepo.getAll({ order });

/** Stores a new user template ("save as template"). */
export const insertArchitectureTemplate = async (
    template: Omit<ArchitectureTemplate, 'createdAt' | 'updatedAt'>
): Promise<ArchitectureTemplate> => {
    const now = new Date();
    const row = { ...template, createdAt: now, updatedAt: now } as ArchitectureTemplate;
    const results = await templateRepo.insert(row);
    return results[0];
};

/** Renames a template and stamps `updatedAt` (a rename is a metadata change). */
export const renameArchitectureTemplate = async (id: string, name: string): Promise<void> => {
    await templateRepo.update(id, { name, updatedAt: new Date() } as Partial<ArchitectureTemplate>);
};

export const deleteArchitectureTemplate = (id: string) => templateRepo.delete(id);

/**
 * Import restore: replaces the WHOLE template table with the bundle snapshot,
 * so the library ends up in exactly the state it was in when the file was
 * exported (todo: architecture import/export/"save as template").
 */
export const replaceAllArchitectureTemplates = async (templates: ArchitectureTemplate[]): Promise<void> => {
    const existing = await templateRepo.getAll();
    for (const row of existing) {
        await templateRepo.delete(row.id);
    }
    if (templates.length === 0) return;
    await templateRepo.insert(templates);
};

import { projectSettingTabs } from "../config/settings/project-settings";
import { IOrderQuery, IWhereQuery } from "jsstore";
import { BaseRepository } from "../db/repository";
import { Project } from "../shared/types/project";
import { BLANK_ARCHITECTURE } from "../config/templates";

export const defaultProjectSettings: Record<string, any> = {};
projectSettingTabs.forEach(tab => {
    tab.settings.forEach(setting => {
        defaultProjectSettings[setting.key] = setting.default;
    });
});

class ProjectRepository extends BaseRepository<Project> {
    constructor() {
        super('projects');
    }

    async getByName(name: string): Promise<Project | undefined> {
        const results = await this.getAll({
            where: { name },
            order: { by: 'id', type: 'desc' },
            limit: 1
        });
        return results[0];
    }
}

const projectRepo = new ProjectRepository();

export const getProject = (id: number) => projectRepo.getById(id);

export const existsProject = async (id: number) => {
    const count = await projectRepo.count({ id });
    return count > 0;
};

export const getProjects = (limit = 10, order: IOrderQuery = { by: 'updatedAt', type: 'desc' }, where: IWhereQuery = {}) => {
    return projectRepo.getAll({ limit, order, where });
};

export const insertProject = async (project: Partial<Project> & { name: string }) => {
    const defaultProject: Omit<Project, 'id'> = {
        name: 'Untitled',
        description: '',
        software: {
            editors: [],
        },
        architecture: JSON.parse(JSON.stringify(BLANK_ARCHITECTURE)),
        settings: JSON.parse(JSON.stringify(defaultProjectSettings)),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const newProject = { ...defaultProject, ...project } as Project;
    delete (newProject as any).id;
    
    const results = await projectRepo.insert(newProject);
    return results[0];
};

export const updateProject = async (project: Project) => {
    if (!project.id) throw new Error('Project id is required');
    
    project.updatedAt = new Date();
    
    await projectRepo.update(project.id, project);
};

export const deleteProject = (id: number) => projectRepo.delete(id);


import { IOrderQuery, ITable } from "jsstore";
import db from "./database";

export interface Project {
    id: number;
    name: string;
    code: string;
    data: number[];
    layoutGridConfig: any;
    savedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    size: number;
}


async function getProjectById(id: number) {
    return (await db.select({
        from: 'projects',
        where: {
            id: id
        }
    }))[0] as Project | undefined;
}

async function getProjectByName(name: string) {
    return (await db.select({
        from: 'projects',
        where: {
            name: name
        },
        order: {
            by: 'id',
            type: 'desc'
        }
    }))[0] as Project | undefined;
}



export const getProject = async (id: number) => {

    const project = await getProjectById(id);
    if (!project)
        return null;

    return project;
};

export const existsProject = async (id: number) => {
    return !!(await getProjectById(id));
}

export const getProjects = async (limit = 10, order: IOrderQuery = { by: 'updatedAt', type: 'desc' }) => {
    let projects = (await db.select({
        from: 'projects',
        limit: limit,
        order: order
    })) as Project[];
    return projects;
};


export const insertProject = async (project: Project) => {

    const defaultProject: Project = {
        id: 0,
        name: 'Untitled',
        code: '',
        data: [],
        layoutGridConfig: {},
        savedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 0
    };

    const newProject = { ...defaultProject, ...project } as { [key: string]: any };

    delete newProject.id;
    newProject.size = JSON.stringify(newProject).length;
    // Add the project to the database
    await db.insert({
        into: 'projects',
        values: [newProject]
    });

    const insertedProject = (await getProjectByName(project.name));
    if (!insertedProject)
        throw new Error('Failed to create project');

    return insertedProject;
}

export const updateProject = async (project: Project) => {
    if (!project.id)
        throw new Error('Project id is required');
    const existingProject = await getProjectById(project.id);
    if (!existingProject)
        throw new Error('Project does not exist');
    project.updatedAt = new Date();
    project.size = JSON.stringify(project).length;
    await db.update({
        in: 'projects',
        set: project,
        where: {
            id: project.id
        }
    });
};

export const deleteProject = async (id: number) => {

    return await db.remove({
        from: 'projects',
        where: {
            id: id
        }
    });
};





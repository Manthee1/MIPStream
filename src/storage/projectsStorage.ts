import { saveToStorage, loadFromStorage, removeFromStorage } from './storage';

const PROJECTS_KEY = 'projects';

export interface Project {
    id: string;
    name: string;
    code: string;
    data: number[];
    layoutGridConfig: any;
    createdAt: Date;
    updatedAt: Date;
    size: number;
}


export const createProject = (name: string): Project => {
    const id = Date.now().toString();
    const project: Project = {
        id,
        name,
        code: '',
        data: [],
        layoutGridConfig: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 0
    };

    console.log('Creating project', project);


    const projects = loadFromStorage(PROJECTS_KEY) || [];
    if (projects.some((p: Project) => p.name === name))
        throw new Error('Project with the same name already exists');

    projects.push(project);
    saveToStorage(PROJECTS_KEY, projects);

    return project;
}

export const saveProject = (project: Project) => {
    const projects = loadFromStorage(PROJECTS_KEY) || [];
    const existingProjectIndex = projects.findIndex((p: Project) => p.id === project.id);

    if (existingProjectIndex === -1)
        throw new Error('Project does not exist');
    project.updatedAt = new Date();
    project.size = JSON.stringify(project).length;
    projects[existingProjectIndex] = project;


    saveToStorage(PROJECTS_KEY, projects);
};

export const loadProjects = (loadOnlyMetadata: boolean = false, limit = 10): Project[] => {
    let projects = loadFromStorage(PROJECTS_KEY) || [];
    projects = projects.slice(0, limit);
    // Remove empty projects
    if (loadOnlyMetadata) {
        return projects.map((project: Project) => ({
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            size: project.size
        }));
    }
    return projects;

};

export const existsProject = (id: string): boolean => {
    const projects = loadProjects(true);
    return projects.some((project: Project) => project.id === id);
}

export const loadProject = (id: string): Project | null => {

    const projects = loadProjects();
    console.log(projects, id);

    return projects.find((project: Project) => project.id === id) || null;
};

export const removeProject = (id: string) => {
    const projects = loadFromStorage(PROJECTS_KEY) || [];
    const existingProjectIndex = projects.findIndex((p: Project) => p.id === id);

    if (existingProjectIndex === -1)
        throw new Error('Project does not exist');

    projects.splice(existingProjectIndex, 1);
    // removeFromStorage(PROJECTS_KEY);
    saveToStorage(PROJECTS_KEY, projects);
};


export const downloadProject = (project: Project) => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(project)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${project.name}.mipstream`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
}

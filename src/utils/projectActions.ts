import { Project } from '../db/projectsTable';
import { useUIStore } from '../stores/UIStore';
import { useNotification } from '@kyvg/vue3-notification';

export const promptProjectName = async (title: string, message: string, defaultName: string = ''): Promise<string | null> => {
    const UIStore = useUIStore();
    const name = await UIStore.prompt({
        title,
        message,
        inputPlaceholder: 'Project Name',
        input: defaultName,
        verifyInput: (input?: string) => {
            if (!input) throw 'Project name is required';
            if (input.length < 3) throw 'Project name must be at least 3 characters long';
            return true;
        },
        confirmText: title,
    });
    if (typeof name === 'boolean') return null;
    return name;
};

export const confirmAction = async (title: string, message: string, confirmText: string, confirmButtonType: string = 'default'): Promise<boolean> => {
    const UIStore = useUIStore();
    return !!await UIStore.confirm({
        title,
        message,
        confirmText,
        confirmButtonType,
    });
};

export const notify = (type: 'success' | 'error', title: string, text: string) => {
    useNotification().notify({
        type,
        title,
        text,
    });
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

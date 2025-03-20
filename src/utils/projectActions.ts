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
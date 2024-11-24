
export const saveToStorage = (key: string, value: any) => {
    try {
        const serializedValue = JSON.stringify(value);
        localStorage.setItem(key, serializedValue);
    } catch (error) {
        console.error('Error saving to storage', error);
    }
};

export const loadFromStorage = (key: string) => {
    try {
        const serializedValue = localStorage.getItem(key);
        if (serializedValue === null) {
            return null;
        }
        return JSON.parse(serializedValue);
    } catch (error) {
        console.error('Error loading from storage', error);
        return null;
    }
};

export const removeFromStorage = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from storage', error);
    }
};
interface DropdownItem {
    label?: string;
    icon?: string;
    action?: (context: ComponentCustomProperties) => void;
    type?: 'item' | 'separator' | 'submenu';
    items?: DropdownItem[]; // Only for submenu
}

type ModalData = {
    show?: boolean,
    title?: string,
    message?: string,
    type?: string,
    onConfirm?: () => void,
    confirmText?: string,
    confirmButtonType?: string,
    onCancel?: () => void,
    cancelText?: string,
    cancelButtonType?: string,
    input?: string,
    inputPlaceholder?: string,
    verifyInput?: (input: string) => boolean | void
}

interface Setting {
    label: string;
    key: string;
    type: 'checkbox' | 'text' | 'number' | 'select' | 'radio';
    default: any;
    options?: { value: string, label: string, description?: string }[];
    description: string;
    icon?: string; // Added icon property
}

interface SettingTab {
    name: string;
    icon?: string;
    description?: string;
    settings: Setting[];
}

interface SettingWindowConfig {
    tabs: SettingTab[];
    settings: Record<string, any>;
    setSetting(key: string, value: any): void;
    title: string;
    icon: string;
    description: string;
}

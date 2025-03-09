interface DropdownItem {
    label?: string;
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


interface LayoutConfig {
    id?: string;
    title?: string;
    component?: string;
    type: 'row' | 'column' | 'panel';
    children?: LayoutConfig[];
}
export interface DropdownItem {
    label?: string;
    action?: () => void;
    type?: 'item' | 'separator' | 'submenu';
    items?: DropdownItem[]; // Only for submenu
}

export type ModalData = {
    show?: boolean,
    title?: string,
    message?: string,
    type?: string,
    onConfirm?: () => void,
    confirmText?: string,
    onCancel?: () => void,
    cancelText?: string,
    input?: string,
    inputPlaceholder?: string,
    verifyInput?: (input?: string) => boolean | void
}

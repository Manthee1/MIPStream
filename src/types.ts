import { ComponentCustomProperties } from "vue";

export interface DropdownItem {
    label?: string;
    action?: (context: ComponentCustomProperties) => void;
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
    confirmButtonType?: string,
    onCancel?: () => void,
    cancelText?: string,
    cancelButtonType?: string,
    input?: string,
    inputPlaceholder?: string,
    verifyInput?: (input: string) => boolean | void
}

export interface DropdownItem {
    label?: string;
    action?: () => void;
    type?: 'item' | 'separator' | 'submenu';
    items?: DropdownItem[]; // Only for submenu
}
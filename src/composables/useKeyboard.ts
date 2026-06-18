import { onMounted, onUnmounted, ref } from 'vue';
import { keyboardShortcuts } from '../config/keyboard-shortcuts';

export type KeyAction = { action: () => void; label?: string; description?: string };
export type KeyMap = Record<string, KeyAction>;

function normalizeEventKey(e: KeyboardEvent): string {
    const parts = [
        (e.ctrlKey ? 'CTRL' : ''),
        (e.shiftKey ? 'SHIFT' : ''),
        (e.altKey ? 'ALT' : ''),
        (e.metaKey ? 'META' : ''),
        e.key.toUpperCase(),
    ];
    return parts.join(' ').trim().replace(/\s+/g, ' ');
}

export function useKeyboard(map: KeyMap = keyboardShortcuts) {
    const lastKey = ref<string | null>(null);
    const enabled = ref(true);

    function handler(e: KeyboardEvent) {
        if (!enabled.value) return;
        const key = normalizeEventKey(e);
        lastKey.value = key;
        if (Object.prototype.hasOwnProperty.call(map, key)) {
            try {
                map[key].action();
                e.preventDefault();
                e.stopPropagation();
            } catch (err) {
                // swallow — callers should handle their own errors
                console.error('Keyboard action error', err);
            }
        }
    }

    function bind() {
        window.addEventListener('keydown', handler);
    }
    function unbind() {
        window.removeEventListener('keydown', handler);
    }

    onMounted(bind);
    onUnmounted(unbind);

    function setShortcut(key: string, action: () => void, label?: string, description?: string) {
        map[key] = { action, label, description };
    }

    function removeShortcut(key: string) {
        delete map[key];
    }

    function disable() { enabled.value = false; }
    function enable() { enabled.value = true; }

    return { lastKey, enabled, setShortcut, removeShortcut, bind, unbind, disable, enable };
}

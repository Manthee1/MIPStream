import type { App } from 'vue';
import { keyboardShortcuts } from '../config/keyboard-shortcuts';

export default {
    install(app: App, options?: { keymap?: Record<string, any> }) {
        const map = options?.keymap ?? keyboardShortcuts;
        function handler(e: KeyboardEvent) {
            const parts = [
                (e.ctrlKey ? 'CTRL' : ''),
                (e.shiftKey ? 'SHIFT' : ''),
                (e.altKey ? 'ALT' : ''),
                (e.metaKey ? 'META' : ''),
                e.key.toUpperCase(),
            ];
            const key = parts.join(' ').trim().replace(/\s+/g, ' ');
            if (Object.prototype.hasOwnProperty.call(map, key)) {
                try {
                    map[key].action();
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {
                    console.error('Keyboard plugin action error', err);
                }
            }
        }
        window.addEventListener('keydown', handler);
        // attach to app so it can be later removed if needed
        // @ts-ignore
        app._keyboardHandler = handler;
    }
};

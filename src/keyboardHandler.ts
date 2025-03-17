import { keyboardShortcuts } from "./config/keyboard-shortcuts";
import { useProgramExecutionStore } from "./stores/programExecutionStore";

export function initKeyboardHandler() {
    document.addEventListener("keydown", e => {

        let keyString = [
            (e.ctrlKey ? "CTRL" : ''),
            (e.shiftKey ? "SHIFT" : ''),
            (e.altKey ? "ALT" : ''),
            (e.metaKey ? "META" : ''),
            e.key.toUpperCase()].join(" ").trim().replace(/\s+/g, ' ');

        console.log(e, keyString);
        if (keyboardShortcuts.hasOwnProperty(keyString)) {
            keyboardShortcuts[keyString]();

            e.preventDefault();
            e.stopPropagation();
        }
    })
}


export function setKeyboardShortcut(key: string, action: () => void) {
    keyboardShortcuts[key] = action;
}
export function removeKeyboardShortcut(key: string) {
    delete keyboardShortcuts[key];
}
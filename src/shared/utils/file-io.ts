/** @format */

/**
 * Browser file helpers for the export/import flows — pure DOM, no app state.
 * This is the seam a future Electron shell swaps for native
 * "Save architecture as" / "Load architecture" dialogs: the flows only ever
 * call `downloadJsonFile` / `pickTextFile`, never the DOM directly.
 */

/** Sanitizes a free-form label into a safe file stem ("My CPU: v2!" → "My-CPU-v2"). */
export function toFileStem(label: string): string {
  const stem = label
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem || 'architecture';
}

/** Triggers a browser download of `data` as pretty-printed JSON. */
export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor); // Firefox requires the anchor to be in the DOM.
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and resolves the selected file's text content.
 * Resolves null when the picker was cancelled or reading failed.
 */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

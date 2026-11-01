/** @format */

import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { assemble } from '@/core/assembler';
import type { AssemblerConfig } from '@/shared/types/isa';
import type { AssemblerDiagnostic } from '@/shared/utils/errors';

/**
 * Maps one assembler diagnostic (1-based line, 0-based columns — the shared
 * lint contract) onto a CodeMirror document range, clamped to the document.
 * Exported pure for headless testing.
 */
export function toCodeMirrorDiagnostic(doc: Text, diag: AssemblerDiagnostic): Diagnostic {
  const line = Math.min(Math.max(1, diag.line), doc.lines);
  const lineInfo = doc.line(line);
  const from = Math.min(lineInfo.from + Math.max(0, diag.columnStart), lineInfo.to);
  const to = Math.min(Math.max(from, lineInfo.from + Math.max(0, diag.columnEnd)), lineInfo.to);
  return { from, to, severity: 'error', message: diag.message };
}

/**
 * Live inline lint (task -0): re-assembles the document with the project's
 * ISA on every debounced edit — the assembler never throws, so this is a
 * pure map over the same diagnostics the load funnel reports. The panel
 * diagnostics strip keeps reflecting the last actual **Load**; inline lint
 * is the as-you-type view of the same contract.
 */
export function assemblyLinter(config: AssemblerConfig): Extension {
  return linter(
    (view) =>
      assemble(view.state.doc.toString(), config).diagnostics.map((diag) =>
        toCodeMirrorDiagnostic(view.state.doc, diag),
      ),
    { delay: 400 },
  );
}

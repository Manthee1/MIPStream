/** @format */

import type { Extension } from '@codemirror/state';
import type { AssemblerConfig } from '@/shared/types/isa';
import { assemblyLanguage } from './assembly-parser';
import { assemblyHighlighting } from './assembly-highlight';
import { assemblyLinter } from './assembly-lint';
import { assemblyCompletions } from './assembly-completions';
import { assemblyGoToDefinition } from './assembly-navigation';
import { currentInstructionHighlight } from './instruction-highlight';

export { setCurrentInstructionLine } from './instruction-highlight';
export { findLabelDefinitions } from './assembly-navigation';

/**
 * The full assembly editor support bundle for one ISA definition: ISA-driven
 * syntax highlighting, live inline lint, autocomplete, Ctrl/⌘+Click
 * go-to-definition and the current-instruction line highlight.
 *
 * Attached through `useCodeMirror`'s support compartment — swapping the ISA
 * (a settings commit) reconfigures the bundle in place without rebuilding
 * the document state.
 */
export function buildAssemblySupport(config: AssemblerConfig): Extension[] {
  return [
    assemblyLanguage(config),
    assemblyHighlighting,
    assemblyLinter(config),
    assemblyCompletions(config),
    assemblyGoToDefinition(),
    currentInstructionHighlight(),
  ];
}

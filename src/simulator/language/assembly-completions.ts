/** @format */

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { AssemblerConfig, InstructionConfig } from '@/shared/types/isa';
import { advanceRegisterNames, registerDescriptions } from '@/shared/utils/registers';
import { findLabelDefinitions } from './assembly-navigation';

/** Directives the assembler understands (sections + data initializers). */
const DIRECTIVES = ['.data', '.text', '.word', '.half', '.byte'] as const;

/** Human-readable operand template (e.g. "rd, rs, rt") for a mnemonic's `info`. */
function operandTemplate(instruction: InstructionConfig): string {
  if (instruction.operands.length === 0) return 'no operands';
  return instruction.operands.map((operand) => operand[0]).join(', ');
}

const registerOptions: { label: string; type: string; detail?: string }[] =
  advanceRegisterNames.map((name, index) => ({
    label: `$${name}`,
    type: 'variable',
    detail: registerDescriptions[index]?.label,
  }));
for (let register = 0; register < 32; register++) {
  registerOptions.push({ label: `$${register}`, type: 'variable' });
}

/**
 * ISA-driven autocomplete (task -0): mnemonics (with an operand template and
 * description) and directives at statement positions; registers and document
 * labels at operand positions. Registered as an `override` source — the only
 * autocompletion instance in the editor (see `useCodeMirror`'s base list).
 */
export function assemblyCompletions(config: AssemblerConfig): Extension {
  const mnemonicOptions = config.instruction_set_config.map((instruction) => ({
    label: instruction.mnemonic,
    type: 'keyword',
    detail: operandTemplate(instruction),
    info: instruction.description,
  }));
  const directiveOptions = DIRECTIVES.map((directive) => ({ label: directive, type: 'keyword' }));

  const source = (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\w.$]+/);
    if (word === null && !context.explicit) return null;

    // Statement position: nothing before the word but whitespace and label
    // definitions — mnemonic/directive territory.
    const line = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);
    const prefix = word ? before.slice(0, before.length - word.text.length) : before;
    if (/^(\s|[A-Za-z_]\w*:\s)*$/.test(prefix)) {
      return {
        from: word ? word.from : context.pos,
        options: [...mnemonicOptions, ...directiveOptions],
        validFor: /^[\w.]*$/,
      };
    }

    const labelOptions = [...findLabelDefinitions(context.state.doc.toString()).keys()].map(
      (label) => ({ label, type: 'label' as const }),
    );
    return {
      from: word ? word.from : context.pos,
      options: [...registerOptions, ...labelOptions],
      validFor: /^[\w$]*$/,
    };
  };

  return autocompletion({ override: [source], activateOnTyping: true });
}

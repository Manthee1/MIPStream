/** @format */

import { StreamLanguage, type StreamParser, type StringStream } from '@codemirror/language';
import { tags as t, type Tag } from '@lezer/highlight';
import type { AssemblerConfig } from '@/shared/types/isa';

/** Per-line parser state: whether a mnemonic was already consumed. */
interface AssemblyLineState {
  seenMnemonic: boolean;
}

/**
 * Legacy token-style names → Lezer tags. The stream parser contract returns
 * style strings; `tokenTable` (StreamLanguage's mapping hook) turns each
 * into the tag the HighlightStyle keys on.
 */
const TOKEN_TABLE: { [name: string]: Tag | readonly Tag[] } = {
  comment: t.comment,
  mnemonic: t.keyword,
  directive: t.meta,
  label: t.labelName,
  register: t.variableName,
  number: t.number,
  punctuation: t.punctuation,
};

/**
 * ISA-driven incremental tokenizer mirroring the config-driven assembler's
 * token rules (`src/core/assembler/tokenize.ts`): whitespace and commas are
 * separators, `;`/`#` start comments, and a label is `identifier:` with no
 * space before the colon. Memory operands like `4($t1)` lex finer here
 * (number + punctuation + register) purely for highlighting — the assembler
 * treats them as single tokens, which the lint contract reflects exactly.
 */
export function buildAssemblyParser(config: AssemblerConfig): StreamParser<AssemblyLineState> {
  const mnemonics = new Set(
    config.instruction_set_config.map((instruction) => instruction.mnemonic.toLowerCase()),
  );

  return {
    name: 'assembly',
    startState: () => ({ seenMnemonic: false }),
    tokenTable: TOKEN_TABLE,
    token: (stream: StringStream, state: AssemblyLineState) => {
      if (stream.sol()) state.seenMnemonic = false;

      if (stream.eatSpace()) return null;
      if (stream.eat(/[;#]/)) {
        stream.skipToEnd();
        return 'comment';
      }
      if (stream.eat(/[,()]/)) return 'punctuation';
      // Directive: `.data`, `.text`, `.word`, …
      if (stream.match(/^\.[A-Za-z_]\w*/)) return 'directive';
      // Label definition: `name:` (colon glued to the identifier).
      if (stream.match(/^[A-Za-z_]\w*:/)) return 'label';
      // Immediate: decimal / hex / binary, optionally negative.
      if (stream.match(/^-?(0x[0-9a-fA-F]+|0b[01]+|\d+)/)) return 'number';
      // Register: `$t0`-style (any `$…` token highlights as a register; the
      // linter flags genuinely invalid ones) or bare `R5`-style.
      if (stream.match(/^\$\w+/) || stream.match(/^R\d+(?![\w.])/)) return 'register';
      // Identifier: the line's first ISA mnemonic, else a label reference.
      // Position-sliced (not `stream.current()`) so the word never depends on
      // the caller's token-start bookkeeping.
      const wordStart = stream.pos;
      if (stream.match(/^[A-Za-z_]\w*/)) {
        const word = stream.string.slice(wordStart, stream.pos);
        if (!state.seenMnemonic && mnemonics.has(word.toLowerCase())) {
          state.seenMnemonic = true;
          return 'mnemonic';
        }
        return 'label';
      }
      stream.next();
      return null;
    },
    languageData: { commentTokens: { line: '#' } },
  };
}

/** The parser wrapped as a language extension. */
export function assemblyLanguage(config: AssemblerConfig) {
  return StreamLanguage.define(buildAssemblyParser(config));
}

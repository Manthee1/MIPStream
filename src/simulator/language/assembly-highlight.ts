/** @format */

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Assembly token styling. Every color follows the app theme variables
 * (src/assets/index.css tokens), so light/dark flips need no re-registration;
 * applied with higher precedence than the base setup's fallback style.
 *
 * Token mapping: mnemonics → keyword, directives (.data/.text/.word) → meta,
 * labels → labelName, registers → variableName, immediates → number.
 */
export const assemblyHighlighting: Extension = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.comment, color: 'var(--text-secondary)', fontStyle: 'italic' },
    { tag: t.keyword, color: 'var(--color-primary)', fontWeight: '600' },
    { tag: t.meta, color: 'var(--color-warning)' },
    { tag: t.labelName, color: 'var(--color-success)' },
    { tag: t.variableName, color: 'var(--color-info)' },
    { tag: t.number, color: 'var(--color-danger)' },
    { tag: t.punctuation, color: 'var(--text-secondary)' },
  ]),
);

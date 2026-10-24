/** @format */

/**
 * Assembly numeric literal parsing for the config-driven assembler: decimal
 * (optionally signed), `0x` hexadecimal and `0b` binary. Bare hexadecimal
 * (without a `0x` prefix) is deliberately rejected so data labels and
 * mnemonics are never mistaken for numbers.
 */

/**
 * Parses a numeric literal. Returns the (possibly negative) numeric value, or
 * null when the token is not a well-formed number.
 */
export function parseSignedValue(text: string): number | null {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;

    let negative = false;
    let digits = trimmed;
    if (digits.startsWith("-")) {
        negative = true;
        digits = digits.slice(1);
    } else if (digits.startsWith("+")) {
        digits = digits.slice(1);
    }

    let value: number;
    const lower = digits.toLowerCase();
    if (/^0x[0-9a-f]+$/.test(lower)) {
        value = parseInt(lower.slice(2), 16);
    } else if (/^0b[01]+$/.test(lower)) {
        value = parseInt(lower.slice(2), 2);
    } else if (/^\d+$/.test(digits)) {
        value = parseInt(digits, 10);
    } else {
        return null;
    }

    return negative ? -value : value;
}
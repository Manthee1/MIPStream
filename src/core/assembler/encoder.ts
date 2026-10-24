/** @format */

import type { AssemblerFieldConfig } from "@/shared/types/isa";
import { widthMask } from "@/shared/utils/bit-ops";

/**
 * Folds resolved field values into one instruction word. Each field's value
 * is consumed LSB-first across its `ranges` in configuration order —
 * multi-range scatter fields are legal and keep the order the ISA author
 * defined. Ranges are LSB-indexed and inclusive.
 */
export function encodeFields(
    fieldValues: Record<string, number>,
    fields: AssemblerFieldConfig[],
    totalBits: number,
): number {
    let word = 0;
    for (const field of fields) {
        const value = fieldValues[field.field] ?? 0;
        let cursor = 0;
        for (const [start, end] of field.ranges) {
            const length = end - start + 1;
            if (length <= 0) continue;
            const segment = (value >>> cursor) & widthMask(length);
            word = (word | (segment << start)) >>> 0;
            cursor += length;
        }
    }
    return (word & widthMask(totalBits)) >>> 0;
}
/** @format */

import { ref } from "vue";
import type { LintIssue } from "@/core/engine/lint";

/**
 * Reactive bridge for the designer's lint report (selection-bridge pattern):
 * SchematicEditor syncs the designer's `onProblemsChange` into this ref and
 * the Problems panel reads it. The designer itself stays Vue-free.
 */

/** The active designer's current lint report. */
export const problems = ref<LintIssue[]>([]);

/** Syncs the reactive problems mirror with the designer's lint report. */
export function setProblems(issues: LintIssue[]): void {
  problems.value = issues;
}

/** Clears the problems mirror (e.g. when the canvas unmounts). */
export function clearProblems(): void {
  problems.value = [];
}

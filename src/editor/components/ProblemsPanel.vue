<script setup lang="ts">
/** @format */

import { computed } from 'vue';
import { NEmpty, NIcon, NScrollbar, NTag, NText } from 'naive-ui';
import { IconAlertTriangle, IconCircleXFilled, IconInfoCircle } from '@tabler/icons-vue';
import { problems } from '../core/problems-bridge';
import { getActiveDesigner } from '../core/designer-bridge';
import type { LintIssue } from '@/core/engine/lint';

/**
 * Designer lint report (problems-bridge fed — selection-bridge pattern).
 * Rows sort by severity; clicking a row selects the offending element on
 * the canvas and centers the viewport on it.
 */

const counts = computed(() => {
  let error = 0;
  let warning = 0;
  let info = 0;
  for (const issue of problems.value) {
    if (issue.severity === 'error') error++;
    else if (issue.severity === 'warning') warning++;
    else info++;
  }
  return { error, warning, info, total: problems.value.length };
});

/** Severity-sorted rows (errors first, then warnings, then info). */
const sorted = computed(() => {
  const order: Record<LintIssue['severity'], number> = { error: 0, warning: 1, info: 2 };
  return [...problems.value].sort((a, b) => order[a.severity] - order[b.severity]);
});

/** Severity icon color, resolved from the global theme variables. */
function iconColor(severity: LintIssue['severity']): string {
  if (severity === 'error') return 'var(--color-danger)';
  if (severity === 'warning') return 'var(--color-warning)';
  return 'var(--color-secondary)';
}

function focusIssue(issue: LintIssue): void {
  getActiveDesigner()?.focusProblem(issue);
}
</script>

<template>
  <div class="h-full flex flex-col bg-surface">
    <div class="px-4 py-2 border-b border-border-color flex items-center justify-between shrink-0">
      <n-text strong class="text-xs uppercase tracking-widest opacity-50">Problems</n-text>
      <div class="flex items-center gap-1.5" v-if="counts.total > 0">
        <n-tag v-if="counts.error" size="tiny" type="error" :bordered="false">
          {{ counts.error }} error{{ counts.error > 1 ? 's' : '' }}
        </n-tag>
        <n-tag v-if="counts.warning" size="tiny" type="warning" :bordered="false">
          {{ counts.warning }} warning{{ counts.warning > 1 ? 's' : '' }}
        </n-tag>
        <n-tag v-if="counts.info" size="tiny" type="info" :bordered="false">
          {{ counts.info }} note{{ counts.info > 1 ? 's' : '' }}
        </n-tag>
      </div>
    </div>

    <n-scrollbar class="flex-1">
      <div v-if="counts.total === 0" class="h-full min-h-24 flex items-center justify-center p-4">
        <n-empty description="No problems detected" />
      </div>

      <div v-else class="flex flex-col">
        <button
          v-for="(issue, index) in sorted"
          :key="index"
          class="flex items-start gap-2 px-4 py-1.5 text-left hover:bg-element cursor-pointer"
          :title="issue.message"
          @click="focusIssue(issue)"
        >
          <n-icon :size="14" class="mt-0.5 shrink-0" :style="{ color: iconColor(issue.severity) }">
            <IconCircleXFilled v-if="issue.severity === 'error'" />
            <IconAlertTriangle v-else-if="issue.severity === 'warning'" />
            <IconInfoCircle v-else />
          </n-icon>
          <span class="text-xs leading-4">{{ issue.message }}</span>
        </button>
      </div>
    </n-scrollbar>
  </div>
</template>

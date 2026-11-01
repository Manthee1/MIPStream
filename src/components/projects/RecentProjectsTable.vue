<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton, NDataTable, NIcon, NInput, NTag, NText, NPopconfirm, useDialog, useMessage,
  type DataTableColumns,
} from 'naive-ui';
import { IconSearch, IconEdit, IconTrash, IconExternalLink } from '@tabler/icons-vue';
import { deleteProject, getAllProjects, getProject, renameProject } from '../../services/projectsService';
import type { Project } from '../../shared/types/project';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectSwitch } from '../../composables/useProjectSwitch';
import { clearLastSession, getLastSession } from '../../storage/session-storage';

/**
 * Home page project table (-24): searchable, sortable columns (Project Name,
 * Last Modified, Mode) with Open / Rename / Delete actions. All data is
 * client-side (project rows are small), so filtering happens in the computed
 * feed and sorting in Naive UI's DataTable column sorters.
 *
 * Open re-fetches the row first so a stale table never clobbers newer
 * autosaved state; Rename uses a Naive dialog with inline validation; Delete
 * is popconfirm-guarded and clears the resume-session pointer when needed.
 */
const projectStore = useProjectStore();
const dialog = useDialog();
const message = useMessage();
const { openProject } = useProjectSwitch();

const projects = ref<Project[]>([]);
const loading = ref(false);
const search = ref('');

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    projects.value = await getAllProjects();
  } catch (error) {
    console.error('Failed to load projects:', error);
    message.error('Failed to load projects.');
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

/** Name-filtered feed (base order: last modified first). */
const rows = computed<Project[]>(() => {
  const query = search.value.trim().toLowerCase();
  const filtered = query
    ? projects.value.filter((project) => project.name.toLowerCase().includes(query))
    : [...projects.value];
  return filtered.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
});

function modeOf(project: Project): 'design' | 'simulate' | null {
  const mode = project.settings?.lastPerspective;
  return mode === 'design' || mode === 'simulate' ? mode : null;
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ------------------------------------------------------------- actions

async function handleOpen(row: Project): Promise<void> {
  // Re-fetch so an autosaved-newer row is what gets opened, not this stale
  // table snapshot.
  const fresh = await getProject(row.id);
  if (!fresh) {
    message.error(`Project “${row.name}” no longer exists.`);
    await refresh();
    return;
  }
  void openProject(fresh);
}

function isValidName(value: string, original: string): boolean {
  return value.trim().length >= 3 && value.trim() !== original.trim();
}

async function commitRename(row: Project, rawName: string): Promise<void> {
  const name = rawName.trim();
  try {
    await renameProject(row.id, name);
    if (projectStore.currentProject?.id === row.id) {
      projectStore.currentProject.name = name;
    }
    message.success('Project renamed.');
    await refresh();
  } catch (error) {
    console.error('Failed to rename project:', error);
    message.error('Failed to rename project.');
  }
}

function handleRename(row: Project): void {
  // A ref (not a closure variable) so the action slot re-renders and the
  // Rename button's disabled state tracks the typed value.
  const name = ref(row.name);
  const reactive = dialog.warning({
    title: 'Rename Project',
    content: () =>
      h('div', { class: 'py-1' }, [
        h(NInput, {
          value: name.value,
          placeholder: 'Project name',
          'onUpdate:value': (value: string) => { name.value = value; },
        }),
      ]),
    action: () =>
      h('div', { class: 'flex w-full items-center justify-end gap-2' }, [
        h(NButton, { size: 'small', onClick: () => reactive?.destroy() },
          { default: () => 'Cancel' }),
        h(NButton, {
          size: 'small', type: 'primary', disabled: !isValidName(name.value, row.name),
          onClick: () => {
            if (!isValidName(name.value, row.name)) return;
            reactive?.destroy();
            void commitRename(row, name.value);
          },
        }, { default: () => 'Rename' }),
      ]),
  });
}

async function handleDelete(row: Project): Promise<void> {
  try {
    await deleteProject(row.id);

    // A stale resume pointer must not resurrect a deleted project.
    const last = getLastSession();
    if (last?.projectId === row.id) clearLastSession();

    // Deleting the active project clears the session so no ghost row lingers
    // (an in-flight autosave cannot resurrect the row: update-by-id is a
    // no-op once the row is gone).
    if (projectStore.currentProject?.id === row.id) {
      projectStore.currentProject = null;
      projectStore.projectSaved = true;
    }

    message.success(`Deleted “${row.name}”.`);
    await Promise.all([refresh(), projectStore.updateRecentProjects()]);
  } catch (error) {
    console.error('Failed to delete project:', error);
    message.error('Failed to delete project.');
  }
}

// ------------------------------------------------------------- columns

const columns = computed<DataTableColumns<Project>>(() => [
  {
    title: 'Project Name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (row) =>
      h('div', { class: 'min-w-0' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          class: 'font-semibold',
          onClick: () => { void handleOpen(row); },
        }, { default: () => row.name }),
        row.description
          ? h(NText, { depth: 3, class: 'block truncate text-xs' }, { default: () => row.description })
          : null,
      ]),
  },
  {
    title: 'Last Modified',
    key: 'updatedAt',
    defaultSortOrder: 'descend',
    sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    render: (row) => h('span', { class: 'text-xs' }, formatDate(row.updatedAt)),
  },
  {
    title: 'Mode',
    key: 'mode',
    width: 110,
    sorter: (a, b) => (modeOf(a) ?? '').localeCompare(modeOf(b) ?? ''),
    render: (row) => {
      const mode = modeOf(row);
      return mode
        ? h(NTag, { size: 'small', bordered: false, type: mode === 'simulate' ? 'success' : 'info' },
            { default: () => (mode === 'simulate' ? 'Simulate' : 'Design') })
        : h(NText, { depth: 3 }, { default: () => '—' });
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 130,
    align: 'right',
    render: (row) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        h(NButton, {
          size: 'tiny', secondary: true, type: 'primary', title: 'Open',
          onClick: () => { void handleOpen(row); },
        }, { icon: () => h(NIcon, null, { default: () => h(IconExternalLink) }) }),
        h(NButton, {
          size: 'tiny', quaternary: true, title: 'Rename',
          onClick: () => handleRename(row),
        }, { icon: () => h(NIcon, null, { default: () => h(IconEdit) }) }),
        h(NPopconfirm, { onPositiveClick: () => { void handleDelete(row); } }, {
          trigger: () =>
            h(NButton, { size: 'tiny', quaternary: true, type: 'error', title: 'Delete' },
              { icon: () => h(NIcon, null, { default: () => h(IconTrash) }) }),
          default: () => `Delete “${row.name}”? This cannot be undone.`,
        }),
      ]),
  },
]);
</script>

<template>
  <div class="grid gap-3">
    <n-input v-model:value="search" placeholder="Search projects…" clearable size="small" class="max-w-xs justify-self-end">
      <template #prefix>
        <n-icon size="14"><IconSearch /></n-icon>
      </template>
    </n-input>

    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="rows.length > 10 ? { pageSize: 10 } : false"
      :row-key="(row: Project) => row.id"
      size="small"
    >
      <template #empty>
        <n-text depth="3">
          {{ search ? 'No projects match your search.' : 'No recent projects found. Start by creating a new project.' }}
        </n-text>
      </template>
    </n-data-table>
  </div>
</template>

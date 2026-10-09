<script setup lang="ts">
/** @format */
import { computed, h, ref } from "vue";
import { NDataTable, NInput, type DataTableColumns } from "naive-ui";
import type { ModulePanelProps } from "../../types/manifest";
import type { RegisterFileConfig } from "./index";
import type { RegisterFileState } from "./logic";
import { advanceRegisterNames } from "../../utils/registers";
import { parseMaskedValue } from "../../utils/bit-ops";

interface RegisterRow {
  index: number;
  name: string;
  value: number;
  locked: boolean;
}

const props = defineProps<ModulePanelProps<RegisterFileConfig, RegisterFileState>>();
const emit = defineEmits<{ (e: "update"): void }>();

const editTick = ref(0);
const hexDigits = computed(() => Math.max(1, Math.ceil(props.config.bitWidth / 4)));

const rows = computed<RegisterRow[]>(() => {
  void props.revision;
  void editTick.value;
  const out: RegisterRow[] = [];
  for (let i = 0; i < props.config.registerCount; i++) {
    const stored = i < props.state.values.length ? props.state.values[i] : 0;
    out.push({
      index: i,
      name: "$" + (advanceRegisterNames[i] ?? "r" + i),
      value: i === 0 ? 0 : stored,
      locked: i === 0,
    });
  }
  return out;
});

function commit(index: number, raw: string): void {
  if (index === 0) return; // $zero is hardwired
  const parsed = parseMaskedValue(raw, props.config.bitWidth);
  if (parsed !== null && index < props.state.values.length) {
    props.state.values[index] = parsed;
    emit("update");
  }
  editTick.value++;
}

const columns = computed<DataTableColumns<RegisterRow>>(() => [
  { title: "#", key: "index", width: 40 },
  { title: "Name", key: "name", width: 80 },
  {
    title: "Hex",
    key: "hex",
    render: (row) =>
      row.locked
        ? "0x" + "0".repeat(hexDigits.value)
        : h(NInput, {
            size: "small",
            defaultValue: "0x" + row.value.toString(16).padStart(hexDigits.value, "0"),
            onChange: (raw: string) => commit(row.index, raw),
          }),
  },
  { title: "Dec", key: "dec", render: (row) => String(row.value) },
]);
</script>

<template>
  <div class="h-full bg-surface">
    <n-data-table
      :columns="columns"
      :data="rows"
      size="small"
      :bordered="false"
      :pagination="false"
      flex-height
      class="h-full"
    />
  </div>
</template>

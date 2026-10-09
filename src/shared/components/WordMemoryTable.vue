<script setup lang="ts">
/** @format */
import { computed, h, ref } from "vue";
import { NDataTable, NInput, type DataTableColumns } from "naive-ui";
import { parseMaskedValue } from "../utils/bit-ops";

interface MemoryRow {
  index: number;
  address: number;
  value: number;
}

const props = defineProps<{
  /** Engine-owned word storage (mutated directly on edit). */
  words: Uint32Array;
  bitWidth: number;
  /** Host sampling counter — bumped whenever the engine updates state. */
  revision?: number;
  readonly?: boolean;
}>();

const emit = defineEmits<{ (e: "update"): void }>();

const editTick = ref(0);
const hexDigits = computed(() => Math.max(1, Math.ceil(props.bitWidth / 4)));

const rows = computed<MemoryRow[]>(() => {
  void props.revision;
  void editTick.value;
  const out: MemoryRow[] = [];
  for (let i = 0; i < props.words.length; i++) {
    out.push({ index: i, address: i * 4, value: props.words[i] });
  }
  return out;
});

function commit(index: number, raw: string): void {
  const parsed = parseMaskedValue(raw, props.bitWidth);
  if (parsed !== null) {
    props.words[index] = parsed;
    emit("update");
  }
  editTick.value++;
}

const columns = computed<DataTableColumns<MemoryRow>>(() => [
  {
    title: "Address",
    key: "address",
    width: 110,
    render: (row) => "0x" + (row.address >>> 0).toString(16).padStart(8, "0"),
  },
  {
    title: "Value (hex)",
    key: "value",
    render: (row) =>
      props.readonly
        ? "0x" + row.value.toString(16).padStart(hexDigits.value, "0")
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
      :pagination="{ pageSize: 32 }"
      flex-height
      class="h-full"
    />
  </div>
</template>

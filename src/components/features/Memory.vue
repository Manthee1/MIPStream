<script setup lang="ts">
import { defineComponent } from 'vue';
import { decToHex } from '../../assets/js/utils';
</script>

<template>
    <!-- Print individual bytes of memory -->
    <div class="memory-list" @onmouseover="showMemoryAddress"
        :style="`grid-template-columns: repeat(${rowWidth + 1}, 1fr)`">
        <span class="memory-address"></span>
        <span class="text-center memory-address column-label" v-for="index in rowWidth" :key="index">0x{{ decToHex(index
            -
            1, 8) }}</span>
        <template v-for="(row, rowIndex) in memoryRows" :key="rowIndex">
            <span class="memory-address row-label">0x{{ decToHex(rowIndex * 16, 8) }}</span>
            <span class="memory-item" v-for="(value, index) in row"
                :data-address="'0x' + decToHex(16 * rowIndex + index, 8)" :key="index"
                :class="{ 'non-zero': value !== 0 }">{{ decToHex(value, 8) }}</span>
        </template>
    </div>
</template>




<script lang="ts">


export default defineComponent({
    name: 'Memory',

    data() {
        return {
            hoveredMemoryAddress: null,
            rowWidth: 32,
        };
    },

    computed: {
        memoryRows(): Uint8Array[] {
            const data = this.$programExecutionStore.core.dataMemory as Uint8Array;
            // Split the data memory into rows of rowWidth bytes
            const rows = [];
            for (let i = 0; i < data.length; i += this.rowWidth) {
                rows.push(data.slice(i, i + this.rowWidth));
            }
            return rows;

        }
    },
    methods: {
        showMemoryAddress(e: MouseEvent) {
            // Check which element is being hovered
            console.log(e);
        }
    },
});
</script>

<style lang="sass" scoped>
// Simmple compact code like style for the memory list
.memory-list
    display: grid
    flex-direction: column
    grid-template-columns: repeat(17, 1fr)
    font-size: 1rem
    padding: 0.5rem
    gap: 0.2rem
    background-color: var(--color-background)
    height: 100%;
    width: 100%;
    overflow: auto;
    ol,ul,li
        list-style-type: none
        padding: 0
        margin: 0

    .memory-address
        display: flex
        justify-content: center
        align-items: center
        background-color: var(--color-medium)
        text-align: center
        padding: 0px 0.2rem
        border: 1px solid var(--color-light)
        &.column-label
            position: sticky
            top: -5px
        &.row-label
            position: sticky
            left: 0
    
    .memory-item
        display: flex
        justify-content: center
        align-items: center
        border: 1px solid var(--color-light)
        text-align: center
        vertical-align: middle
        &.non-zero
            background-color: var(--color-light)
        // Make memory itme on hover show a tooltip with the memory address
        &:hover
            position: relative
            background-color: var(--color-light)
            cursor: pointer
            &:after
                content: attr(data-address)
                position: absolute
                top: 100%
                left: 50%
                transform: translateX(-50%)
                background-color: var(--color-background-dark)
                padding: 0.2rem
                border: 1px solid var(--color-light)
                border-radius: 5px
                z-index: 100
</style>
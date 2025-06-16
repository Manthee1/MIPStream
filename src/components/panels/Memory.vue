<script setup lang="ts">
import { defineComponent } from 'vue';
import { decToHex, isXBit, parseNumber } from '../../assets/js/utils';
import { notify } from '@kyvg/vue3-notification';
</script>

<template>
    <div class="memory-list" @click="editMemoryAddress" :style="`grid-template-columns: repeat(${rowWidth + 1}, 1fr)`">
        <span class="memory-address"></span>
        <span class="text-center memory-address column-label" v-for="index in rowWidth" :key="index">0x{{
            decToHex(index
                -
                1, 8) }}</span>
        <template v-for="(row, rowIndex) in memoryRows" :key="rowIndex">
            <span class="memory-address row-label">0x{{ decToHex(rowIndex * 16, 8) }}</span>
            <span class="memory-item" v-for="(value, index) in row"
                :data-address="'0x' + decToHex(16 * rowIndex + index, 8)" :key="index"
                :class="{ 'non-zero': value !== 0 }">
                <template v-if="editMemoryAddressIndex == 16 * rowIndex + index">
                    <input class="input-small" v-model="newMemoryValue" @keyup.enter="saveMemoryValue"
                        @keyup.esc="editMemoryAddressIndex = -1" @blur="saveMemoryValue" />
                </template>
                <template v-else>
                    {{ decToHex(value, 8) }}
                </template>
            </span>
        </template>
        {{ newMemoryValue }}
    </div>
</template>




<script lang="ts">


export default defineComponent({
    name: 'Memory',

    data() {
        return {
            hoveredMemoryAddress: null,
            editMemoryAddressIndex: -1,
            newMemoryValue: 0 as number | string,
            rowWidth: 16,
        };
    },

    mounted() {
    },

    computed: {
        memoryRows(): number[][] {
            const data = this.$simulationStore.core.dataMemory;
            // Split the data memory into rows of rowWidth bytes
            const rows = [];
            for (let i = 0; i < data.length; i += this.rowWidth) {
                rows.push(data.slice(i, i + this.rowWidth));
            }
            return rows;

        }
    },
    methods: {
        editMemoryAddress(event: MouseEvent) {
            // Check which element is being clicked
            const target = event.target as HTMLElement;
            if (target.classList.contains('memory-item')) {
                const address = parseInt(target.getAttribute('data-address')!.slice(2), 16);
                this.editMemoryAddressIndex = address;
                this.newMemoryValue = this.$simulationStore.core.dataMemory[address];
                // focus the input when it's rendered
                this.$nextTick(() => {
                    const input = document.querySelector('.memory-item input') as HTMLInputElement;
                    input.focus();
                    input.select();
                });
            }
        },

        saveMemoryValue(event: Event) {
            const input = event.target as HTMLInputElement;
            let value;
            try {
                value = parseNumber(this.newMemoryValue + '');
                if (!isXBit(value, 32)) throw "Value must be a 32-bit integer"
            } catch (error: any) {
                notify({
                    title: 'Error',
                    text: error,
                    type: 'error',
                });
                return;
            }
            this.$simulationStore.core.dataMemory[this.editMemoryAddressIndex] = value;
            this.editMemoryAddressIndex = -1;
        },
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
    font-family: var(--font-family-mono);
    padding: 0.5rem
    gap: 0.2rem
    // background-color: var(--color-surface-0)
    width: 100%;
    overflow: auto;
    height: 100%;
    ol,ul,li
        list-style-type: none
        padding: 0
        margin: 0

    .memory-address
        display: flex
        justify-content: center
        align-items: center
        background-color: var(--color-surface-1)
        text-align: center
        padding: 0px 0.2rem
        border: 1px solid var(--color-surface-1)
        &.column-label
            position: sticky
            top: -5px
        &.row-label
            position: sticky
            left: -5px
    
    .memory-item
        display: flex
        justify-content: center
        align-items: center
        border: 1px solid var(--color-surface-1)
        text-align: center
        vertical-align: middle
        
        &.non-zero
            background-color: var(--color-surface-1)
        // Make memory itme on hover show a tooltip with the memory address
        &:hover
            position: relative
            background-color: var(--color-surface-1)
            cursor: pointer
            &:after
                content: attr(data-address)
                position: absolute
                top: 100%
                left: 50%
                transform: translateX(-50%)
                background-color: var(--color-surface-1)
                padding: 0.2rem
                border: 1px solid var(--color-surface-1)
                border-radius: 5px
                z-index: 100
        input
            padding: 0.4rem 0.2rem
            border: 1px solid var(--color-surface-3)
            border-radius: 2px
            text-align: center
            font-size: 1rem
            outline: none
            min-width: auto;
            width: 40px;
</style>
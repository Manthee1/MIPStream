<script setup lang="ts">
import { defineComponent } from 'vue';
import { decToHex } from '../../assets/js/utils';
</script>

<template>
    <!-- Print individual bytes of memory -->
    <div class="memory-list" @onmouseover="showMemoryAddress">
        <ol class="memory-row">
            <li></li>
            <li class="text-center" v-for="index in 16" :key="index">{{ decToHex(index - 1, 8) }}</li>
        </ol>
        <ol class="memory-row" v-for="(row, rowIndex) in memoryRows" :key="rowIndex">
            <li class="memory-address">{{ decToHex(rowIndex * 16, 8) }}</li>
            <li class="memory-item" v-for="(value, index) in row"
            :data-address="'0x' + decToHex(16 * rowIndex + index, 8)" :key="index"
            :class="{ 'non-zero': value !== 0 }">{{ decToHex(value, 8) }}</li>
        </ol>
    </div>
</template>




<script lang="ts">


export default defineComponent({
    name: 'Memory',

    computed: {
        memoryRows(): number[][] {
            // @ts-ignore
            const data = this.$dlxStore.DLXCore.memory.data
            // Split the memory into 8 byte rows
            return data.reduce((rows: number[][], value: number, index: number) => {
                const rowIndex = Math.floor(index / 16)
                if (!rows[rowIndex]) {
                    rows[rowIndex] = []
                }
                rows[rowIndex].push(value)
                return rows
            }, [])

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
    grid-template-columns: repeat(17, 1fr)
    font-size: 1rem
    padding: 0.5rem
    gap: 0.2rem
    background-color: var(--color-background)
    ol,ul
        list-style-type: none
        padding: 0
        margin: 0
    .memory-row
        display: contents
        .memory-item
            display: block
            border: 1px solid var(--color-light)
            text-align: center
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
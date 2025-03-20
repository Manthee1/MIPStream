<script setup lang="ts">
import { defineComponent } from 'vue';
import { decToHex } from '../../assets/js/utils';
</script>

<template>
    <div>
        <div class="pc">
            <span>PC</span>
            <span>0x{{ decToHex($simulationStore.core.PC.value, 8) }}</span>
            <span>{{ $simulationStore.core.PC.value }} ({{ $simulationStore.core.PC.value / 4 }})</span>
        </div>
        <div class="registers-container">
            <ul class="register-list">
                <li class="register-item" v-for="(value, index) in registers.slice(0, 16)" :key="index">
                    <span>R{{ index }}</span>
                    <!-- Binary value -->
                    <span>0x{{ decToHex(value, 8) }}</span>
                    <span>{{ value }}</span>
                </li>
            </ul>
            <ul class="register-list">
                <li class="register-item" v-for="(value, index) in registers.slice(16)" :key="index">
                    <span>R{{ index + 16 }}</span>
                    <!-- Binary value -->
                    <span>0x{{ decToHex(value, 8) }}</span>
                    <span>{{ value }}</span>
                </li>
            </ul>
        </div>
    </div>
</template>




<script lang="ts">


export default defineComponent({
    name: 'Registers',

    computed: {
        registers(): number[] {
            // @ts-ignore
            return this.$simulationStore.core.registerFile as number[]
        }
    }
});
</script>

<style lang="sass" scoped>
// Simmple compact code like style for the register list

.pc
    display: flex
    flex-flow: row nowrap
    justify-content: space-between
    padding: 0.5rem 1rem
    font-size: 1.5rem
    border-bottom: 1px solid #ccc

.registers-container
    display: flex
    flex-flow: row nowrap
    flex: 1 1 auto
    gap: 2rem
    font-size: 1.5rem
    padding: 0.5rem 1rem

    .register-list
        list-style-type: none
        padding: 0
        margin: 0
        display: grid
        grid-template-columns: repeat(3, 1fr)
        column-gap: 1rem
        flex: 1 1 auto
        &:first-child
            padding-right: 2rem
            border-right: 1px solid #ccc
        .register-item
            display: contents
            border-bottom: 1px solid #ccc
            &:last-child
                border-bottom: none
            span
                text-align: center
                &:first-child
                    text-align: left
                &:last-child
                    text-align: right
</style>

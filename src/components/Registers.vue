<script setup lang="ts">
import { decToHex } from '../assets/js/utils';
import Window from './Window.vue';
</script>

<template>
    <Window title="Registers" class="registers-window">
        <div class="registers-container">
            <ul class="register-list">
                <li class="register-item" v-for="(value, index) in registers.slice(0, 16)" :key="index">
                    <span>R{{ index }}</span>
                    <!-- Binary value -->
                    <span>{{ decToHex(value, 32) }}</span>
                    <span>{{ value }}</span>
                </li>
            </ul>
            <ul class="register-list">
                <li class="register-item" v-for="(value, index) in registers.slice(16)" :key="index">
                    <span>R{{ index + 16 }}</span>
                    <!-- Binary value -->
                    <span>0x{{ decToHex(value, 32) }}</span>
                    <span>{{ value }}</span>
                </li>
            </ul>
        </div>
    </Window>
</template>




<script lang="ts">


export default {
    name: 'Registers',

    computed: {
        registers(): number[] {
            // @ts-ignore
            return this.$dlxStore.DLXCore.cpu.intRegisters as number[]
        }
    }
};
</script>

<style lang="sass" scoped>
// Simmple compact code like style for the register list
.registers-window
    display: flex
    flex-flow: column wrap
    flex: 1 1 auto
    .registers-container
        display: flex
        flex-flow: row nowrap
        flex: 1 1 auto
        gap: 2rem
        
        
        .register-list
            list-style-type: none
            padding: 0
            margin: 0
            display: grid
            grid-template-columns: repeat(3, 1fr)
            gap: 0rem
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

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
            <ul class="register-list" v-for="(column) in [0, 1]" :key="'reg-column-' + column">
                <li class="register-item" @click="editRegister(column * 16 + index)"
                    :class="{ 'editing': editRegisterIndex == column * 16 + index }"
                    v-for="(value, index) in registers.slice(column * 16, (column + 1) * 16)" :key="index">
                    <span class="flex-0 register-name">R{{ column * 16 + index }}</span>
                    <!-- Binary value -->
                    <template v-if="editRegisterIndex == column * 16 + index">
                        <input class="input-small" type="number" v-model="registers[column * 16 + index]"
                            @keyup.enter="editRegisterIndex = -1" @blur="editRegisterIndex = -1" />
                    </template>
                    <template v-else>
                        <span>0x{{ decToHex(value, 8) }}</span>
                        <span>{{ value }}</span>
                    </template>
                </li>
            </ul>

        </div>
    </div>
</template>




<script lang="ts">


export default defineComponent({
    name: 'Registers',

    data() {
        return {
            editRegisterIndex: -1,
        };
    },

    computed: {
        registers(): number[] {
            // @ts-ignore
            return this.$simulationStore.core.registerFile as number[]
        },
    },
    methods: {
        editRegister(index: number) {
            this.editRegisterIndex = index;
            // focus the input when it's rendered
            this.$nextTick(() => {
                const input = document.querySelector('.register-item input') as HTMLInputElement;
                input.focus();
                input.select();
            });
        },
    },
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
    gap: 1rem
    font-size: 1.5rem
    padding: 0.5rem 1rem

    .register-list
        list-style-type: none
        padding: 0
        margin: 0
        display: flex
        flex-flow: column nowrap
        justify-content: center
        align-content: center
        gap: 0.2rem
        flex: 1 1 auto
        &:first-child
            padding-right: 1rem
            border-right: 1px solid var(--color-medium)
        .register-item
            display: flex
            flex-flow: row nowrap
            border-bottom: 1px solid var(--color-medium)
            cursor: pointer
            padding: 0.3rem 0.8rem
            gap: 0.5rem
            border-radius: 2px
            >*
                flex: auto
                width: 100%
                text-align: center
            &:hover
                background-color: var(--color-light)
            &:last-child
                border-bottom: none
            &.editing
                .register-name
                    flex: 0 0 auto
                    width: auto
                    text-align: right
            input
                padding: 0.2rem
                border: 1px solid var(--color-medium)
                border-radius: 2px
                text-align: center
                font-size: 1rem
                outline: none
                min-width: auto;
                width: 0px;
            span
                text-align: center
                &:first-child
                    text-align: left
                &:last-child
                    text-align: right
</style>

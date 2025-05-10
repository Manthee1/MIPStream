<script setup lang="ts">
import { defineComponent } from 'vue';
import { advanceRegisterNames, decToBinary, decToHex } from '../../assets/js/utils';
import { default as _ } from '../../assets/js/core/config/cpu-variables';

</script>

<template>
    <div class="registers">
        <div class="pc">
            <span>PC</span>
            <span>0x{{ decToHex($simulationStore.core.PC.value, 16) }}</span>
            <span>{{ $simulationStore.core.PC.value }} ({{ $simulationStore.core.PC.value / 4 }})</span>
        </div>
        <div class="registers-container">
            <ul class="register-list" v-for="(column) in [0, 1]" :key="'reg-column-' + column">
                <li class="register-item" @click="editRegister(column * 16 + index)"
                    :class="{ 'editing': editRegisterIndex == column * 16 + index, 'updated': column * 16 + index == lastUpdatedRegister }"
                    v-for="(value, index) in registers.slice(column * 16, (column + 1) * 16)" :key="index">
                    <span class="flex-0 register-name">{{ getRegisterName(column * 16 + index) }}</span>
                    <!-- Binary value -->
                    <template v-if="editRegisterIndex == column * 16 + index">
                        <input class="input-small" type="number" v-model="registers[column * 16 + index]"
                            @keyup.enter="editRegisterIndex = -1" @blur="editRegisterIndex = -1" />
                    </template>
                    <template v-else>
                        <span>{{ parseValue(value,
                            $projectStore.getProjectSetting('registerValueRepresentationColumn1')) }}</span>
                        <span>{{ parseValue(value,
                            $projectStore.getProjectSetting('registerValueRepresentationColumn2')) }}</span>
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
        lastUpdatedRegister(): number {
            if (this.$simulationStore.stagePCs[4] == -1 || !(_?.RegWrite_WB.value ?? 0)) return -1
            return (_?.WriteRegister_WB.value ?? -1)
        }

    },


    methods: {
        editRegister(index: number) {
            if (index == 0) {
                this.$notify({
                    type: 'error',
                    title: 'Error',
                    text: 'Cannot edit register 0',
                    duration: 2000,
                });
                return;
            }
            this.editRegisterIndex = index;
            // focus the input when it's rendered
            this.$nextTick(() => {
                const input = document.querySelector('.register-item input') as HTMLInputElement;
                input.focus();
                input.select();
            });
        },
        getRegisterName(registerNumber: number) {
            const prefix = this.$projectStore.getProjectSetting('registerPrefix');

            if (this.$projectStore.getProjectSetting('registerNamingConvention') == 'advanced') {
                return prefix + advanceRegisterNames[registerNumber];
            }

            return prefix + registerNumber;

        },
        parseValue(value: number, type: string) {
            switch (type) {
                case 'hex':
                    return '0x' + decToHex(value, 8);
                case 'dec':
                    return value;
                case 'unsignedDec':
                    return value >>> 0;
                case 'bin':
                    return decToBinary(value, 32);
                default:
                    return value;
            }
        },
    },
});
</script>

<style lang="sass" scoped>
div.registers
    overflow: auto
    height: 100%

.pc
    display: flex
    flex-flow: row nowrap
    justify-content: space-between
    padding: 0.5rem 1rem
    font-size: 1.2rem
    font-family: var(--font-family-mono)
    border-bottom: 1px solid #ccc

.registers-container
    display: flex
    flex-flow: row nowrap
    flex: 1 1 auto
    gap: 1rem
    font-size: 1.2rem
    font-family: var(--font-family-mono)
    padding: 0.5rem 1rem

    .register-list
        list-style-type: none
        padding: 0
        margin: 0
        display: flex
        flex-flow: column nowrap
        justify-content: center
        align-content: center
        flex: 1 1 auto
        &:first-child
            padding-right: 1rem
            border-right: 1px solid var(--color-surface-3)
        .register-item
            display: flex
            flex-flow: row nowrap
            border-bottom: 1px solid var(--color-surface-3)
            cursor: pointer
            padding: 0.3rem 0.8rem
            gap: 0.5rem
            >*
                flex: auto
                width: 100%
                text-align: center
            &:hover
                background-color: var(--color-surface-1)
            &:last-child
                border-bottom: none
            &.updated
                background-color: var(--color-accent-background)
                color: var(--color-regular)

            &.editing
                .register-name
                    flex: 0 0 auto
                    width: auto
                    text-align: right
            
            input
                padding: 0.2rem
                border: 1px solid var(--color-surface-3)
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

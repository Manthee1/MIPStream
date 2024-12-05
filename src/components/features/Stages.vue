<script lang="ts" setup>
import { defineComponent } from 'vue';
import INSTRUCTION_SET from '../../assets/js/config/instructionSet';
import { getStageName } from '../../assets/js/utils';

</script>

<template>
    <ol class="stages-list">
        <li class="stage-item" v-for="(stage, index) in stages" :key="'stage-' + index" :title="JSON.stringify(stage, null, 2)">
            <div>{{ getStageName(index) }}</div>
            <div>{{ INSTRUCTION_SET[stage.IR.opcode].mnemonic }}</div>
        </li>
    </ol>
</template>

<script lang="ts">

export default defineComponent({
    name: 'Stages',
    data() {
        return {
        };
    },
    computed: {
        stages(): any {
            return this.$cpuStore.MIPSCore.cpu.stages;
        },
    },
});
</script>

<style lang="sass" scoped>
.stages-list
    display: flex
    flex-flow: row nowrap
    list-style-type: none
    padding: 0
    margin: 0
    
    .stage-item
        border: 1px solid var(--color-black)
        padding: 0.5rem
        text-align: center
        flex: 1 1 auto

</style>

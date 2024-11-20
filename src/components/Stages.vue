<script lang="ts" setup>
import INSTRUCTION_SET from '../assets/js/config/instructionSet';
import { getStageName } from '../assets/js/utils';
import Window from './Window.vue';

</script>

<template>
    <Window title="Stages" class="stages-window">
        <ol class="stages-list">
            <li class="stage-item" v-for="(stage, index) in stages" :key="'stage-'+index">
                <div>{{ getStageName(index) }}</div>
                <div>{{ INSTRUCTION_SET[stage.IR.opcode].mnemonic }}</div>
            </li>
        </ol>
    </Window>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Stages',
  data() {
    return {
    };
  },
    computed: {
        stages() : any {
        return this.$dlxStore.DLXCore.cpu.stages;
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
        border: 1px solid #000
        padding: 0.5rem
        text-align: center

</style>

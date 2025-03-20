<script lang="ts" setup>
import { defineComponent } from 'vue';
// import { getStageName } from '../../assets/js/utils';

</script>

<template>
    <ol class="stages-list">
        <li class="stage-item" v-for="(stage, index) in stages" :key="'stage-' + index">
            <!-- Table displaying all the values of each stage -->

            <div class="flex flex-row flex-wrap text-left gapx-2">
                <label class="flex-12 text-center m-0">{{ index }}</label>
                <div class="flex-6 flex flex-row flex-nowrap" v-for="(reference, key) in stage" :key="key">
                    <span class="flex-6">{{ key }}</span>
                    <span class="flex-6 text-right">{{ reference.value }}</span>
                </div>
                <div class="flex-6"></div>
            </div>
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
        stages(): typeof this.$simulationStore.core.stageRegisters {
            return this.$simulationStore.core.stageRegisters;
        },
    },
});
</script>

<style lang="sass" scoped>
.stages-list
    display: flex
    flex-flow: column nowrap
    list-style-type: none
    font-size: 1.1rem
    padding: 0
    margin: 0
    
    .stage-item
        border-bottom: 1px solid var(--color-medium)
        padding: 0.5rem
        flex: 1 1 auto

</style>

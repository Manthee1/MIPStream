<script setup lang="ts">
import Editor from '@/components/Editor.vue';
import Registers from '@/components/Registers.vue';
import Memory from '../components/Memory.vue';
import Stages from '../components/Stages.vue';
import Controls from '../components/Controls.vue';


</script>

<template>
    <div class="flex flex-row flex-nowrap flex-top height-full">
        <div class="flex flex-column flex-top flex-nowrap height-full width-full p-5 gap-4">
            <Controls />
            <Editor />
        </div>
        <div class="flex flex-column flex-top">
            <Stages />
            <Registers />
            <Memory />
        </div>
        <!-- ADDI R2, R0, 20 -->
    </div>

</template>

<script lang="ts">
export default {
    name: 'Main',

    data() {
        return {
            program: ''
        }
    },

    methods: {
        loadProgram() {
            console.log('load program');
            console.log(this.$dlxStore.program);

            this.$dlxStore.loadProgram();
        },
        runCycle() {
            this.$dlxStore.DLXCore.runCycle();
        }
    }

}
</script>
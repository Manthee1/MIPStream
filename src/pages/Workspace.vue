<script setup lang="ts">
import Editor from '@/components/core/Editor.vue';
import Controls from '@/components/core/Controls.vue';
import SideBar from '@/components/layout/SideBar.vue';
import Settings from '@/components/windows/Settings.vue';
import CpuView from '@/components/core/CpuView.vue';
import Window from '@/components/common/Window.vue';
</script>

<template>
    <div class="content-wrapper">
        <SideBar />
        <div class="editor-wrapper">
            <Controls />
            <Editor />
        </div>
        <CpuView v-show="$viewStore.showCpuView" />
    </div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ConfirmModal from '../components/common/ConfirmModal.vue';

export default defineComponent({
    components: {
        Editor,
        Controls,
        SideBar,
        CpuView,
        Window,
        ConfirmModal
    },
    name: 'Main',

    data() {
        return {
            program: ''
        }
    },

    methods: {

    }

});
</script>

<style lang="sass" scoped>
.content-wrapper
    display: flex
    flex-flow: row nowrap
    justify-content: flex-start
    align-content: flex-start
    gap: 0rem
    height: 100%
    width: 100%
    max-width: 100vw
    > * 
        flex: 1 1 auto
    .editor-wrapper
        display: flex
        flex-flow: column nowrap
        gap: 0rem
        width: auto
        max-width: 100vw
        height: 100%
        overflow: auto
        .editor
            width: 100%
            height: 100%
            max-height: 100%
            max-width: 100vw
            overflow: auto


</style>
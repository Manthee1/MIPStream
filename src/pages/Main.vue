<script setup lang="ts">
import Editor from '@/components/core/Editor.vue';
import Controls from '@/components/core/Controls.vue';
import TopBar from '@/components/layout/TopBar.vue';
import SideBar from '@/components/layout/SideBar.vue';
import Settings from '@/components/windows/Settings.vue';
import CpuView from '@/components/core/CpuView.vue';
import Window from '@/components/common/Window.vue';

</script>

<template>
    <TopBar fileName="Test"></TopBar>
    <div class="content-wrapper">
        <SideBar />
        <div class="editor-wrapper">
            <Controls />
            <Editor />
        </div>
        <CpuView v-show="$viewStore.showCpuView" />
    </div>
    <div class="settings-wrapper" v-if="$viewStore.showSettings">
        <Window title="Settings" class="settings-window" closeable :onClose="$viewStore.toggleSettings">
            <Settings></Settings>
        </Window>
    </div>


</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        TopBar,
        Editor,
        Controls,
        SideBar,
        CpuView,
        Window
    },
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
.settings-wrapper
    position: absolute
    top: 0
    left: 0
    width: 100%
    height: 100%
    background-color: rgba(0, 0, 0, 0.5)
    display: flex
    justify-content: center
    align-items: center
    z-index: 100


</style>
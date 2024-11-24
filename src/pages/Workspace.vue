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
            <Editor v-model='project.code' />
        </div>
        <CpuView v-show="$viewStore.showCpuView" />
    </div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { loadProject, Project, saveProject } from '../storage/projectsStorage';
import { useViewStore } from '../stores/viewStore';

export default defineComponent({
    components: {
        Editor,
        Controls,
        SideBar,
        CpuView,
        Window,
    },
    name: 'Main',

    props: {
        id: {
            type: String,
            required: true
        }
    },

    data() {
        return {
            project: {} as Project,
            projectSaved: true
        }
    },

    watch: {
        project: {
            deep: true,
            handler(newVal) {
            this.projectSaved = false;
            this.$viewStore.setTitle(this.project.name +' - DLXSim *');
            
            // If no activity in 2 seconds, and autoSave is enabled, save the project
            if (this.$settings.autoSave) {
                setTimeout(() => {
                    console.log('Auto Saving');
                    saveProject(newVal);
                }, 2000);
            }
        },
    },
    },
    beforeMount() {
        const project = loadProject(this.id);
        if (!project && project ==null)  {
            this.$router.push('/');
            return;
        }
        
        this.project = project;
        
        
        this.$viewStore.changeDropdownItemAction('Save', () => {
            console.log('Saving', this.project);
            
            this.saveProject();
        });
    },
    async beforeRouteLeave(to, from) {
        const $confirm = useViewStore().confirm;
        if (this.projectSaved) return true;
        // Stop the user from navigating away without saving
        const confirm = await $confirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to leave?',
            confirmText: 'Leave',
            cancelText: 'Stay'
        });
        if (confirm) {
            return true;

        }else {
            return false;
        }

    },
    mounted() {
        this.$viewStore.setTitle(this.project.name +' - DLXSim');

        // Add a CTRL+S shortcut to save the project
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
        });
    },

    methods: {
        saveProject() {
            saveProject(this.project);
            this.$viewStore.setTitle(this.project.name +' - DLXSim');
            this.projectSaved = true;
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


</style>
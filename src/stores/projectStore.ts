import { defineStore } from 'pinia';
import { Project } from '../shared/types/project';
import { updateProject, getProjects } from '../services/projectsService';
import { toRaw } from 'vue';

export const useProjectStore = defineStore('project', {
    state: () => ({
        currentProject: null as Project | null,
        projectSaved: true,
        recentProjects: [] as Project[],
        /**
         * Monotonic counter bumped by every in-memory project mutation
         * (`markUnsaved`, `updateArchitecture`, `updateSoftware`).
         * `saveProject` compares it before/after its async write so edits
         * landing while a save is in flight never leave the project wrongly
         * marked clean.
         */
        mutationCount: 0,
    }),

    actions: {
        setCurrentProject(project: Project) {
            this.currentProject = project;
            this.projectSaved = true;
            this.updateRecentProjects();
        },

        async saveProject() {
            if (!this.currentProject) return;
            const epochAtStart = this.mutationCount;
            try {
                this.currentProject.updatedAt = new Date();
                await updateProject(toRaw(this.currentProject) as any);
                // Stay dirty when something mutated during the write — the
                // change is not in the persisted row yet.
                this.projectSaved = this.mutationCount === epochAtStart;
            } catch (error: any) {
                console.error('Failed to save project:', error);
                throw error;
            }
        },

        updateArchitecture(updater: (config: Project['architecture']) => void) {
            if (!this.currentProject) return;
            updater(this.currentProject.architecture);
            this.markUnsaved();
        },

        /**
         * Applies a mutation to the current project's software layer (code
         * editors) and marks the project unsaved. Editor content edits funnel
         * through here on settings commits and history restores.
         */
        updateSoftware(updater: (software: Project['software']) => void) {
            if (!this.currentProject) return;
            if (!this.currentProject.software) this.currentProject.software = { editors: [] };
            updater(this.currentProject.software);
            this.markUnsaved();
        },

        /** Marks the current project as having unsaved changes (e.g. canvas edits). */
        markUnsaved() {
            if (!this.currentProject) return;
            this.projectSaved = false;
            this.mutationCount++;
        },

        async updateRecentProjects() {
            this.recentProjects = await getProjects(10, { by: 'updatedAt', type: 'desc' });
        }
    }
});


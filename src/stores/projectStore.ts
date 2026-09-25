import { defineStore } from 'pinia';
import { Project } from '../shared/types/project';
import { updateProject, getProjects } from '../services/projectsService';
import { notify } from '../utils/projectActions';
import { toRaw } from 'vue';

export const useProjectStore = defineStore('project', {
    state: () => ({
        currentProject: null as Project | null,
        projectSaved: true,
        recentProjects: [] as Project[],
    }),
    
    actions: {
        setCurrentProject(project: Project) {
            this.currentProject = project;
            this.projectSaved = true;
            this.updateRecentProjects();
        },

        async saveProject() {
            if (!this.currentProject) return;
            try {
                this.currentProject.updatedAt = new Date();
                await updateProject(toRaw(this.currentProject) as any);
                this.projectSaved = true;
                notify('success', 'Project Saved', 'The project has been saved successfully');
            } catch (error: any) {
                notify('error', 'Error', error.message);
            }
        },

        updateArchitecture(updater: (config: Project['architecture']) => void) {
            if (!this.currentProject) return;
            updater(this.currentProject.architecture);
            this.projectSaved = false;
        },

        async updateRecentProjects() {
            this.recentProjects = await getProjects(10, { by: 'updatedAt', type: 'desc' });
        }
    }
});

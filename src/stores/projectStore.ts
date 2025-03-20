import { useSimulationStore } from './simulationStore';
import { defineStore } from 'pinia';
import { addProject, createProject, downloadProject, existsProject, loadProject, Project, removeProject, saveProject } from '../storage/projectsStorage';
import { promptProjectName, confirmAction, notify } from '../utils/projectActions';
import { useRouter } from 'vue-router';
import { useUIStore } from './UIStore';
import { useSettingsStore } from './settingsStore';

export const useProjectStore = defineStore('project', {
    state: () => ({
        currentProject: null as Project | null,
        projectSaved: true,
    }),
    getters: {

    },
    actions: {
        setCurrentProject(project: Project) {

            if (!project && project == null) {
                useRouter().push("/");
                return;
            }
            this.currentProject = project;

            setTimeout(() => {
                useUIStore().setTitle(project.name + " - MIPStream");
                useSimulationStore().reset()
            }, 0);

            useUIStore().changeDropdownItemAction("Save", () => {
                console.log("Saving", this.currentProject);
                this.saveProject();
            });

            useUIStore().changeDropdownItemAction("Download", () => {
                if (!this.currentProject) return;
                downloadProject(this.currentProject);
            });

        },


        saveProject() {
            if (!this.currentProject) return;
            try {
                saveProject(this.currentProject);
            }
            catch (error: any) {
                notify('error', 'Error', error.message);
                return;
            }
            useUIStore().setTitle(this.currentProject.name + " - MIPStream");

            notify('success', 'Project Saved', 'The project has been saved successfully');
        },

        updateProjectCode(code: string) {
            if (!code || !this.currentProject) return;
            this.currentProject.code = code;
            this.projectSaved = false;
            useUIStore().setTitle(this.currentProject.name + " - MIPStream *");

            // If no activity in 2 seconds, and autoSave is enabled, save the project
            if (useSettingsStore().autoSave) {
                setTimeout(() => {
                    console.log("Auto Saving");
                    this.saveProject();
                }, 2000);
            }
        },

        updateProjectLayout(layout: any) {
            if (!layout || !this.currentProject) return;
            this.currentProject.layoutGridConfig = layout;
            this.projectSaved = false;
            this.saveProject();
        },




        async invokeProjectSetup() {
            const name = await promptProjectName('Create Project', 'Enter the name of the project');
            if (!name) return;

            try {
                const project = createProject(name);
                this.currentProject = project;
                notify('success', 'Project Created', 'The project has been created successfully');
                return project;
            } catch (error: any) {
                notify('error', 'Error', error.message);
            }
            return null;
        },

        async invokeProjectDeletion(projectId: string) {
            const confirm = await confirmAction('Delete Project', 'Are you sure you want to delete this project?', 'Delete', 'error');
            if (!confirm) return false;

            try {
                removeProject(projectId);
                if (this.currentProject?.id === projectId) {
                    this.currentProject = null;
                }
                notify('success', 'Project Deleted', 'The project has been deleted successfully');
                return true;
            } catch (error: any) {
                notify('error', 'Error', error.message);
                return false;
            }
        },

        async invokeProjectRename(projectId: string) {
            const project = loadProject(projectId);
            if (!project) {
                notify('error', 'Error', 'Project not found');
                return false;
            }

            const name = await promptProjectName('Rename Project', 'Enter the new name of the project', project.name);
            if (!name) return false;

            saveProject({ ...project, name });
            notify('success', 'Project Renamed', 'The project has been renamed successfully');
            return true;
        },

        async invokeProjectUpload() {
            return new Promise<Project | null>((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.mipstream';

                input.onchange = async () => {
                    const file = input.files?.item(0);
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const data = reader.result;
                        let project: Project;
                        try {
                            project = JSON.parse(data as string);
                        } catch (error: any) {
                            notify('error', 'Error', "Invalid project file: " + error.message);
                            resolve(null);
                            return;
                        }

                        if (existsProject(project.id)) {
                            const overwrite = await confirmAction('Project Exists', 'A project with the same id already exists. Do you want to overwrite it?', 'Overwrite', 'error');
                            if (overwrite) {
                                saveProject(project);
                                notify('success', 'Project Updated', 'The project has been updated successfully');
                                resolve(project);
                                return;
                            }
                            project.id = Date.now().toString();
                        }

                        project = addProject(project);
                        notify('success', 'Project Uploaded', 'The project has been uploaded successfully');
                        resolve(project);
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
    },
});
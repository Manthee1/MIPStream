import { useSimulationStore } from './simulationStore';
import { defineStore } from 'pinia';
import { insertProject, existsProject, getProject, Project, deleteProject, updateProject, getProjects, defaultProjectSettings } from '../db/projectsTable';
import { promptProjectName, confirmAction, notify, downloadProject } from '../utils/projectActions';
import { useRouter } from 'vue-router';
import { useUIStore } from './UIStore';
import { useSettingsStore } from './settingsStore';
import { rejects } from 'assert';
import { clone } from '../assets/js/utils';
import { toRaw } from 'vue';
import { settings } from '../storage/settingsStorage';

export const useProjectStore = defineStore('project', {
    state: () => ({
        currentProject: null as Project | null,
        projectSaved: true,
        recentProjects: [] as Project[],
        settings: settings
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

            useSimulationStore().init(project);

            this.updateRecentProjects();

        },


        saveProject() {
            if (!this.currentProject) return;
            try {
                this.currentProject.savedAt = new Date();
                updateProject(toRaw(this.currentProject));
                this.projectSaved = true;
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

        setProjectSetting(key: string, value: any) {
            if (!this.currentProject) return;
            this.currentProject.settings = { ...defaultProjectSettings, ...this.currentProject.settings, [key]: value };
            console.log("Settings Updated", this.currentProject);
            updateProject(toRaw(this.currentProject));
        },

        updateProjectLayout(layout: any) {
            if (!layout || !this.currentProject) return;
            this.currentProject.layoutGridConfig = clone(layout);
            console.log("Layout Updated", this.currentProject);
            updateProject(toRaw(this.currentProject));

        },




        async invokeProjectSetup() {
            const name = await promptProjectName('Create Project', 'Enter the name of the project');
            if (!name) return;

            try {
                const project = await insertProject({ name } as Project);
                this.currentProject = project;
                notify('success', 'Project Created', 'The project has been created successfully');
                this.updateRecentProjects();
                return project;
            } catch (error: any) {
                notify('error', 'Error', error.message);
            }
            return null;
        },

        async invokeProjectDeletion(projectId: number) {
            const confirm = await confirmAction('Delete Project', 'Are you sure you want to delete this project?', 'Delete', 'error');
            if (!confirm) return false;

            try {
                deleteProject(projectId);
                if (this.currentProject?.id === projectId) {
                    this.currentProject = null;
                }
                notify('success', 'Project Deleted', 'The project has been deleted successfully');
                this.updateRecentProjects();
                return true;
            } catch (error: any) {
                notify('error', 'Error', error.message);
                return false;
            }
        },

        async invokeProjectRename(projectId: number) {
            return new Promise<boolean>(async (resolve) => {
                const project = await getProject(projectId);
                if (!project) {
                    notify('error', 'Error', 'Project not found');
                    return false;
                }

                const name = await promptProjectName('Rename Project', 'Enter the new name of the project', project.name);
                if (!name) {
                    resolve(false);
                    return;
                }

                updateProject({ ...project, name });
                notify('success', 'Project Renamed', 'The project has been renamed successfully');
                this.updateRecentProjects();
                resolve(true);
            });
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

                        if (await existsProject(project.id)) {
                            const overwrite = await confirmAction('Project Exists', 'A project with the same id already exists. Do you want to overwrite it?', 'Overwrite', 'error');
                            if (overwrite) {
                                updateProject(project);
                                notify('success', 'Project Updated', 'The project has been updated successfully');
                                this.updateRecentProjects();
                                resolve(project);
                                return;
                            }
                        }

                        try {

                            // Convert date strings to Date objects
                            project.createdAt = new Date(project.createdAt);
                            project.updatedAt = new Date(project.updatedAt);
                            project.savedAt = new Date(project.savedAt);

                            project = await insertProject(project);
                            notify('success', 'Project Uploaded', 'The project has been uploaded successfully');
                            this.updateRecentProjects();
                            resolve(project);
                        } catch (error: any) {
                            notify('error', 'Error', error.message);
                            resolve(null);
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        },


        async updateRecentProjects() {
            this.recentProjects = await getProjects(10, { by: 'updatedAt', type: 'desc' });
        }
    },
});
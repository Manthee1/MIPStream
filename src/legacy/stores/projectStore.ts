import { useSimulationStore } from './simulationStore';
import { defineStore } from 'pinia';
import { insertProject, existsProject, getProject, Project, deleteProject, updateProject, getProjects, defaultProjectSettings } from '../services/projectsService';
import { promptProjectName, confirmAction, notify, downloadProject } from '../utils/projectActions';
import { useRouter } from 'vue-router';
import { useUIStore } from './UIStore';
import { useSettingsStore } from './settingsStore';
import { clone } from '../assets/js/utils';
import { toRaw } from 'vue';
import { settings } from '../storage/settingsStorage';
import { CPUS } from '../core/config/cpus';

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
                useUIStore().setTitle(project.name);
            }, 0);

            useUIStore().changeDropdownItemAction("Save", () => {
                this.saveProject();
            });

            useUIStore().changeDropdownItemAction("Download", () => {
                if (!this.currentProject) return;
                downloadProject(this.currentProject);
            });

            useSimulationStore().reset()
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
            useUIStore().setTitle(this.currentProject.name);

            notify('success', 'Project Saved', 'The project has been saved successfully');
        },

        updateProjectCode(code: string) {
            if (!code || !this.currentProject) return;
            this.currentProject.code = code;
            this.projectSaved = false;
            useUIStore().setTitle(this.currentProject.name + ' (unsaved)');

            // If no activity in 2 seconds, and autoSave is enabled, save the project
            if (useSettingsStore().autoSave) {
                setTimeout(() => {
                    this.saveProject();
                }, 2000);
            }
        },

        setProjectSetting(key: string, value: any) {
            if (!this.currentProject) return;
            this.currentProject.settings = { ...defaultProjectSettings, ...this.currentProject.settings, [key]: value };


            if (key == 'cpuType') {
                const cpuType = value;
                const cpuConfig = CPUS[cpuType];
                if (!cpuConfig) {
                    notify('error', 'Error', 'CPU type ${cpuType} not found. Using default CPU.');
                    this.currentProject.settings.cpuType = 'basic';
                    return;
                }
            }
            const settingsRequiringDiagramUpdate = ['diagramValueRepresentation', 'diagramShowValues'];
            if (settingsRequiringDiagramUpdate.includes(key)) {
                useSimulationStore().cpuDiagram.draw();
            }

            // If the setting in
            const settingsRequiringReinit = ['cpuType', 'memorySize', 'registerPrefix'];
            if (settingsRequiringReinit.includes(key)) {

                useSimulationStore().reset();
                useSimulationStore().init(this.currentProject);
            }



            updateProject(toRaw(this.currentProject));
        },

        async updateProjectLayout(layout: any) {
            if (!layout || !this.currentProject) return;
            this.currentProject.layoutGridConfig = clone(layout);
            await updateProject(toRaw(this.currentProject));

        },

        getProjectSetting(key: string) {
            if (!this.currentProject) return defaultProjectSettings[key];
            return this.currentProject.settings[key];
        },




        async invokeProjectSetup() {
            const name = await promptProjectName('Create Project', 'Enter the name of the project');
            if (!name) return;

            // Define the default project code as a template for new projects
            const defaultProjectCode = `
; Example program that multiples data1 and data2
.data
    data1: .word 4       ; Define a word(4bytes) in the data segment with value 4
    data2: .word 5       ; Define another word in the data segment with value 5
.text
main:
    lw $t0, data1        ; Load the value of data1 into register $t0
    lw $t1, data2        ; Load the value of data2 into register $t1
    nop                  ; No operation (used for pipeline delay)
    nop                  ; No operation (used for pipeline delay)
multiply:
    addi $t1, $t1, -1    ; Decrement the value in $t1 by 1
    add $t2, $t2, $t0    ; Add the value in $t0 to $t2
    nop                  ; No operation (used for pipeline delay)
    beq $t1, $zero, end  ; Branch to 'end' if $t1 equals zero
    nop                  ; No operation (used for pipeline delay)
    nop                  ; No operation (used for pipeline delay)
    nop                  ; No operation (used for pipeline delay)
    beq $zero, $zero, multiply ; Unconditional branch to 'multiply'
    nop                  ; No operation (used for pipeline delay)
    nop                  ; No operation (used for pipeline delay)
    nop                  ; No operation (used for pipeline delay)
end:

`;
            try {
                const project = await insertProject({ name, code: defaultProjectCode } as Project);
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
            this.recentProjects = await getProjects(10, { by: 'savedAt', type: 'desc' });
        }
    },
});
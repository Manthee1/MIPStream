import { defineStore } from 'pinia'
import { settings } from '../storage/settingsStorage';
import { addProject, createProject, existsProject, loadProject, Project, removeProject, saveProject } from '../storage/projectsStorage';
import { useRouter } from 'vue-router';
import { CPUDiagram } from '../assets/js/core/diagram/CPUDiagram';
import { useNotification } from '@kyvg/vue3-notification';


const theme = settings.theme;

// Add the theme to the html element
document.documentElement.classList.add(`theme-${theme}`);

export const useViewStore = defineStore('view', {
    state: () => ({
        showCpuView: false,
        showSettings: false,
        theme: theme,
        cpuDiagram: {} as CPUDiagram,
        modalData: {} as ModalData,
        topBar: {
            title: '',
            dropdownItems: [] as DropdownItem[]
        },
    }),
    getters: {

    },
    actions: {
        toggleCpuView() {
            this.showCpuView = !this.showCpuView;
        },
        toggleSettings() {
            this.showSettings = !this.showSettings;
        },
        setTitle(title: string) {
            this.topBar.title = title;
        },
        setTheme(newTheme: string) {
            document.documentElement.classList.add('theme-transition');
            this.theme = newTheme;
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${this.theme}`);
            // Remove the transition style after the transition is complete
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 500);
        },

        // Chacge dropdown item action
        changeDropdownItemAction(name: string, action: () => void) {
            const item = this.topBar.dropdownItems.find(item => item.label === name);
            if (item) {
                item.action = action;
            }
        },

        async confirm(data: ModalData): Promise<string | boolean> {
            Object.assign(data, { type: 'confirm' });
            return await this.modal(data) as boolean;
        },

        async prompt(data: ModalData): Promise<string | boolean> {
            console.log(data);
            Object.assign(data, { type: 'prompt' });
            return await this.modal(data) as string;
        },

        async modal(data: ModalData): Promise<string | boolean> {
            console.log('modal', data);

            // If no message is provided, use the title as the message
            if (!data.message) {
                data.message = data.title;
                data.title = '';
            }
            this.modalData = Object.assign({
                show: true,
                title: data.title,
                message: data.message,
                type: data.type,
                confirmText: data.confirmText || 'Confirm',
                confirmButtonType: data.confirmButtonType || 'accent',
                cancelText: data.cancelText || 'Cancel',
                cancelButtonType: data.cancelButtonType || 'default',
                input: data.input || '',
                inputPlaceholder: data.inputPlaceholder || '',
                verifyInput: data.verifyInput || (() => true),
            }, data);

            console.log(this.modalData);


            return new Promise((resolve) => {
                this.modalData.onConfirm = () => {
                    this.modalData.show = false;
                    if (this.modalData.type === 'confirm') resolve(true);
                    resolve(this.modalData?.input || '');
                };
                this.modalData.onCancel = () => {
                    this.modalData.show = false;
                    resolve(false);
                };
            });

        },

        async setupProject() {
            const name = await this.prompt({
                title: 'Create Project',
                message: 'Enter the name of the project',
                inputPlaceholder: 'Project Name',
                verifyInput: (input?: string) => {
                    if (!input) throw 'Project name is required';
                    if (input.length < 3)
                        throw 'Project name must be at least 3 characters long';

                    return true;
                },
                confirmText: 'Create Project',
            });

            if (!name || typeof name !== 'string') return;
            console.log('Create Project', name);

            try {
                const project = createProject(name);
                return project;
            } catch (error) {
                this.confirm({
                    title: 'Error',
                    message: error.message,
                    confirmText: 'Ok',
                    confirmButtonType: 'error',
                });
            }
            return null;

        },

        async deleteProject(projectId: string) {
            const confirm = await this.confirm({
                title: 'Delete Project',
                message: 'Are you sure you want to delete this project?',
                confirmText: 'Delete',
                confirmButtonType: 'error',
            });

            if (confirm) {
                console.log('Delete Project', projectId);
                try {
                    removeProject(projectId);
                } catch (error) {
                    useNotification().notify({
                        type: 'error',
                        title: 'Error',
                        text: error.message,
                    });
                    return false;
                }
                return true;
            }
            return false;
        },

        async renameProject(projectId: string) {
            const project = loadProject(projectId);
            if (!project) {
                useNotification().notify({
                    type: 'error',
                    title: 'Error',
                    text: 'Project not found',
                });
                return;
            }
            const name = await this.prompt({
                title: 'Rename Project',
                message: 'Enter the new name of the project',
                inputPlaceholder: 'Project Name',
                input: project.name,
                verifyInput: (input?: string) => {
                    if (!input) throw 'Project name is required';
                    if (input.length < 3)
                        throw 'Project name must be at least 3 characters long';

                    return true;
                },
                confirmText: 'Rename Project',
            })

            if (!name || typeof name !== 'string') return;

            saveProject({ ...project, name });
            useNotification().notify({
                type: 'success',
                title: 'Project Renamed',
                text: 'The project has been renamed successfully',
            });

            return true;
        },


        setTopBar(title: string, dropdownItems: DropdownItem[]) {

            this.topBar = {
                title: title,
                dropdownItems
            };
        },

        async handleProjectUpload() {
            return new Promise<Project | null>((resolve) => {
                // Add file input field to the dom and open it
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.mipstream';

                input.onchange = async () => {
                    const file = input.files?.item(0);
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const data = reader.result;
                        console.log(data);

                        let project: Project;
                        try {
                            project = JSON.parse(data as string);
                        }
                        catch (error) {
                            useNotification().notify({
                                type: 'error',
                                title: 'Error',
                                text: "Invalid project file: " + error.message,
                            });
                            resolve(null);
                            return;
                        }

                        // If exists, ask to overwrite or create new
                        if (existsProject(project.id)) {
                            const overwrite = await this.confirm({
                                title: 'Project Exists',
                                message: 'A project with the same id already exists. Do you want to overwrite it?',
                                confirmText: 'Overwrite',
                                confirmButtonType: 'error',
                                cancelText: 'Create New',
                                cancelButtonType: 'default',
                            });
                            if (overwrite) {
                                saveProject(project);
                                useNotification().notify({
                                    type: 'success',
                                    title: 'Project Updated',
                                    text: 'The project has been updated successfully',
                                });
                                resolve(project);
                                return;
                            }
                            delete project.id;
                        }

                        project = addProject(project);
                        useNotification().notify({
                            type: 'success',
                            title: 'Project Uploaded',
                            text: 'The project has been uploaded successfully',
                        });
                        resolve(project);
                        return;
                    };
                    reader.readAsText(file);
                };
                input.click();
            });

        }
    },







})



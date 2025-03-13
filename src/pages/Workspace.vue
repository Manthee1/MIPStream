<!-- @format -->

<script setup lang="ts">
import Editor from "@/components/core/Editor.vue";
import Controls from "@/components/core/Controls.vue";
import SideBar from "@/components/layout/SideBar.vue";
import CpuView from "@/components/core/CpuView.vue";
import Window from "@/components/common/Window.vue";
import DockviewTab from "../components/layout/DockviewTab.vue";

</script>

<template>
	<DockviewVue @ready="onReady"
		:class="{ 'dockview-theme-light': $viewStore.theme == 'light', 'dockview-theme-dark': $viewStore.theme == 'dark' }"
		style="height: 100%">
		<SideBar id="sidebar" />
		<Stages />
		<Registers />
		<Memory />

		<div id="editor">
			<Controls />
			<Editor :key="project.id" v-model="project.code" @update:modelValue="codeUpdate()" />
		</div>

		<Accordion id='problems' open :label="`Problems (${$programExecutionStore.errors.length})`">
			<Problems />
		</Accordion>

		<CpuView id='cpuView' v-show="$viewStore.showCpuView" />
	</DockviewVue>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { downloadProject, loadProject, Project, saveProject } from "../storage/projectsStorage";
import Problems from "../components/core/Problems.vue";
import Accordion from "../components/common/Accordion.vue";
import { DockviewReadyEvent, DockviewVue, SerializedDockview } from "dockview-vue";
import Registers from "../components/features/Registers.vue";
import Stages from "../components/features/Stages.vue";
import Memory from "../components/features/Memory.vue";

let confirmSaveBeforeLeave = async () => true;
let codeUpdate = (code) => { };

export default defineComponent({
	components: {
		Editor,
		Controls,
		SideBar,
		CpuView,
		Window,
		Problems,
		Registers,
		Accordion,
		Stages,
		Memory,
		DockviewVue,
		DockviewTab,
	},
	name: "Main",

	props: {
		id: {
			type: String,
			required: true,
		},
	},

	data() {
		return {
			project: {} as Project,
			projectSaved: true,
		};
	},

	watch: {
		id() {
			const project = loadProject(this.id);
			if (!project) {
				this.$router.push("/");
				return;
			}
			this.project = project;
			this.$nextTick(() => {
				this.$viewStore.setTitle(this.project.name + " - MIPStream");
			});
		},
	},
	beforeMount() {
		const project = loadProject(this.id);
		if (!project && project == null) {
			this.$router.push("/");
			return;
		}

		this.project = project;

		this.$viewStore.changeDropdownItemAction("Save", () => {
			console.log("Saving", this.project);

			this.saveProject();
		});

		this.$viewStore.changeDropdownItemAction("Download", () => {
			downloadProject(this.project);
		});




	},
	async beforeRouteLeave(_to, _from) {
		return await confirmSaveBeforeLeave();
	},
	async beforeRouteUpdate(_to, _from) {
		return await confirmSaveBeforeLeave();
	},
	mounted() {
		this.$viewStore.setTitle(this.project.name + " - MIPStream");

		// Add a CTRL+S shortcut to save the project
		window.addEventListener("keydown", (e) => {
			if (e.ctrlKey && e.key === "s") {
				e.preventDefault();
				this.saveProject();
			}
		});

		confirmSaveBeforeLeave = async () => {
			if (this.projectSaved) return true;
			// Stop the user from navigating away without saving
			const confirm = await this.$confirm({
				title: "Unsaved Changes",
				message: "You have unsaved changes. Are you sure you want to leave?",
				confirmText: "Leave",
				cancelText: "Stay",
			});
			if (confirm) return true;
			return false;
		};
	},

	methods: {
		saveProject() {
			saveProject(this.project);
			this.$viewStore.setTitle(this.project.name + " - MIPStream");
			this.projectSaved = true;
		},
		codeUpdate(code?: string) {
			if (!code) return;
			this.project.code = code;
			console.log("Code Updated", this.project.code);

			this.projectSaved = false;
			this.$viewStore.setTitle(this.project.name + " - MIPStream *");

			// If no activity in 2 seconds, and autoSave is enabled, save the project
			if (this.$settings.autoSave) {
				setTimeout(() => {
					console.log("Auto Saving");
					saveProject(this.project);
				}, 2000);
			}
		},
		onReady(event: DockviewReadyEvent) {
			console.log('Dockview ready', event);
			const api = event.api;


			event.api.onDidLayoutChange(() => {
				const layout = api.toJSON();
				this.project.layoutGridConfig = layout.grid;
				saveProject(this.project);
			});



			const defaultLayoutGridConfig = {
				"root": {
					"type": "branch",
					"data": [
						{
							"type": "leaf",
							"data": {
								"views": [
									"stages",
									"registers",
									"memory"
								],
								"activeView": "memory",
								"id": "2"
							},
							"size": 371
						},
						{
							"type": "leaf",
							"data": {
								"views": [
									"editor"
								],
								"activeView": "editor",
								"id": "3"
							},
							"size": 688
						},
						{
							"type": "branch",
							"data": [
								{
									"type": "leaf",
									"data": {
										"views": [
											"cpuView"
										],
										"activeView": "cpuView",
										"id": "4"
									},
									"size": 586
								},
								{
									"type": "leaf",
									"data": {
										"views": [
											"problems"
										],
										"activeView": "problems",
										"id": "5"
									},
									"size": 317
								}
							],
							"size": 861
						}
					],
					"size": 903
				},
				"width": 1920,
				"height": 903,
				"orientation": "HORIZONTAL"
			};

			console.log(this?.project?.layoutGridConfig);

			const layoutGridConfig = (Object.keys(this?.project?.layoutGridConfig ?? {}).length > 0) ? this.project.layoutGridConfig : defaultLayoutGridConfig;

			const conf: SerializedDockview = {
				"grid": layoutGridConfig as any,
				"panels": {
					"stages": {
						"id": "stages",
						"contentComponent": "Stages",
						"title": "Stages",
						"tabComponent": "DockviewTab",

					},
					"registers": {
						"id": "registers",
						"contentComponent": "Registers",
						"title": "Registers",
						"tabComponent": "DockviewTab",
					},
					"memory": {
						"id": "memory",
						"contentComponent": "Memory",
						"title": "Memory",
						"tabComponent": "DockviewTab",
					},
					"editor": {
						"id": "editor",
						"contentComponent": "Editor",
						"title": "Editor",
						"params": {
							"id": this.project.id,
							"code": this.project.code,
							"onUpdate": this.codeUpdate,
						},
						"tabComponent": "DockviewTab",

					},
					"cpuView": {
						"id": "cpuView",
						"contentComponent": "CpuView",
						"title": "CPU",
						"tabComponent": "DockviewTab",
					},
					"problems": {
						"id": "problems",
						"contentComponent": "Problems",
						"title": "Problems",
						"tabComponent": "DockviewTab",
					}
				},
				"activeGroup": "5"
			};

			api.fromJSON(conf);
		}
	},
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
		height: 100%
		width: 100%
		overflow: hidden
</style>

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
	<DockviewVue @ready="onReady" :key="id"
		:class="{ 'dockview-theme-light': $UIStore.theme == 'light', 'dockview-theme-dark': $UIStore.theme == 'dark' }"
		style="height: 100%">
	</DockviewVue>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Problems from "../components/core/Problems.vue";
import Accordion from "../components/common/Accordion.vue";
import { DockviewReadyEvent, DockviewVue, SerializedDockview } from "dockview-vue";
import Registers from "../components/features/Registers.vue";
import Stages from "../components/features/Stages.vue";
import Memory from "../components/features/Memory.vue";
import HexView from "../components/features/HexView.vue";
import Instructions from "../components/features/Instructions.vue";
import { defaultLayoutGridConfig, panelsConfig } from "../config/layout";

let confirmSaveBeforeLeave = async () => true;
let codeUpdate = (code: string) => { };

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
		HexView,
		Instructions,
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


	async beforeRouteLeave(_to, _from) {
		return await confirmSaveBeforeLeave();
	},
	async beforeRouteUpdate(_to, _from) {
		return await confirmSaveBeforeLeave();
	},
	mounted() {
		confirmSaveBeforeLeave = async () => {
			if (this.$projectStore.projectSaved) return true;
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

		onReady(event: DockviewReadyEvent) {
			console.log('Dockview ready', event);
			const api = event.api;
			this.$UIStore.dockviewApi = api;
			const projectStore = this.$projectStore;

			const currentProject = projectStore.currentProject;

			if (!currentProject) {
				return;
			}

			event.api.onDidLayoutChange(() => {
				const layout = api.toJSON();
				projectStore.updateProjectLayout(layout.grid);
			});

			console.log(currentProject?.layoutGridConfig);

			const layoutGridConfig = (Object.keys(currentProject?.layoutGridConfig ?? {}).length > 0) ? currentProject.layoutGridConfig : defaultLayoutGridConfig;

			const panelConfig = panelsConfig;
			panelConfig['editor'].params = {
				"id": currentProject.id,
				"code": currentProject.code,
			}

			const conf: SerializedDockview = {
				"grid": layoutGridConfig as any,
				"panels": panelConfig,
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

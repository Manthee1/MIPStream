<script setup lang="ts">

</script>

<template>
	<!-- <div id="editor-wrapper"> -->
	<Controls />
	<div ref="editor" class="editor-container">
		<!-- <div id="editor" ref="editor" theme="vs" :options="options" v-model:value="$simulationStore.loadedProgram" </div> -->
		<!-- <div id="editor" ref="editor"> </div> -->
	</div>
	<!-- </div> -->

</template>

<script lang="ts">

import { defineComponent } from 'vue';
// import { getStageName } from '../../assets/js/utils';
import { initLSP, default as monaco } from "../../config/monaco";
import Controls from './Controls.vue';
import { useProjectStore } from '../../stores/projectStore';
import { validate } from '../../config/monaco/validationProvider';

let editor: monaco.editor.IStandaloneCodeEditor;
export default defineComponent({
	components: {
		Controls
	},
	data() {
		return {
			decorations: [] as string[],
			hoverDecorations: [] as string[],
			stageDecorations: [] as string[],
		}
	},
	props: {
		params: Object
	},

	mounted() {

		const thisEl = this.$el.parentElement as HTMLDivElement;

		// dv-split-view-container
		const dvSplitViewContainer = thisEl.closest('.dv-split-view-container') as HTMLDivElement;
		if (dvSplitViewContainer) {
			dvSplitViewContainer.style.overflow = 'visible';
		}

		const dvGroupView = thisEl.closest('.dv-groupview') as HTMLDivElement;
		if (dvGroupView) {
			dvGroupView.style.overflow = 'visible';
		}
		let dvView = thisEl.closest('.dv-view') as HTMLDivElement;
		while (dvView) {
			dvView.style.overflow = 'visible';
			dvView = dvView.parentElement?.closest('.dv-view') as HTMLDivElement;
		}



		console.log('Editor Mounted', this.params);
		let code = this.params?.params.code
		const editorEl = this.$refs.editor as HTMLElement;
		editor = monaco.editor.create(editorEl, {
			language: 'asm',
			minimap: {
				enabled: true
			},
			automaticLayout: true,
			theme: this.$UIStore.theme,
			padding: {
				top: 10,
				bottom: 10
			},
			value: code,
			parameterHints: {
				enabled: true
			},
			glyphMargin: true,
			lineNumbersMinChars: 2,
			suggest: {
				snippetsPreventQuickSuggestions: false,
				showSnippets: true,
				preview: true,
			},
			cursorSmoothCaretAnimation: this.$settings.smoothCursor,
		});
		const model = editor.getModel();
		if (!model) return;
		validate(model);
		// initLSP(this.$simulationStore.core.instructionMemory);


		// Listener for changes in the editor
		monaco.editor.getModels()[0].onDidChangeContent(() => {
			const code = monaco.editor.getModels()[0].getValue();
			this.$simulationStore.updateCode(code);
			this.$projectStore.updateProjectCode(code);


		});

		editor.onMouseDown((e) => {
			if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
				const lineNumber = e.target.position.lineNumber;
				this.toggleBreakpoint(lineNumber);
			}
		});

		editor.onMouseMove(this.handleMouseMove);
	},

	beforeUnmount() {
		monaco.editor.getModels()[0].dispose();
	},

	computed: {
		currentPC(): number {
			// return 0;
			return this.$simulationStore.stagePCs[0] + this.$simulationStore.core.PC.value;
		}
	},
	watch: {
		currentPC(_newVal: number) {
			const model = editor.getModel();
			if (!model) return;
			this.stageDecorations = model.deltaDecorations(this.stageDecorations, [0, 1, 2, 3, 4].map(index => {

				if (this.$simulationStore.stagePCs[index] == -1) return [];

				const stageName = "stage-" + index;
				const line = this.$simulationStore.PCToLineMap[this.$simulationStore.stagePCs[index]];

				// Scroll to the line if the stage is if
				if (index == 0) {
					editor.revealLineInCenter(line);
					editor.revealLine(line);
				}

				return [
					{
						range: new monaco.Range(+line, 1, +line, 1),
						options: {
							isWholeLine: true,
							className: 'run-line-' + stageName + ' run-line'
						}
					}
				]
			}).flat());

		},
		'$UIStore.theme': {
			handler() {
				if (!editor) return;
				editor.updateOptions({
					theme: this.$UIStore.theme
				});
			},
			immediate: true
		}

	},
	methods: {
		handleMouseMove(e: monaco.editor.IEditorMouseEvent) {
			const model = editor.getModel();
			if (!model) return;
			if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
				const lineNumber = e.target.position.lineNumber;
				this.hoverDecorations = model.deltaDecorations(this.hoverDecorations, [
					{
						range: new monaco.Range(lineNumber, 1, lineNumber, 1),
						options: {
							isWholeLine: true,
							glyphMarginClassName: 'hover-breakpoint'
						}
					}
				]);
				return;
			}
			this.hoverDecorations = model.deltaDecorations(this.hoverDecorations, []);
		},


		updateBreakpoints() {
			const model = editor.getModel();
			if (!model) return;
			const decorations = model.deltaDecorations(this.decorations, this.$simulationStore.breakpoints.map(line => ({
				range: new monaco.Range(line, 1, line, 1),
				options: {
					isWholeLine: true,
					glyphMarginClassName: 'breakpoint'
				}
			})));
			this.decorations = decorations;
		},

		toggleBreakpoint(line: number) {
			if (this.$simulationStore.breakpoints.includes(line)) {
				this.removeBreakpoint(line);
			} else {
				this.addBreakpoint(line);
			}

		},
		addBreakpoint(line: number) {
			this.$simulationStore.breakpoints.push(line);
			this.updateBreakpoints();
		},
		removeBreakpoint(line: number) {
			this.$simulationStore.breakpoints = this.$simulationStore.breakpoints.filter(b => b !== line);
			this.updateBreakpoints();
		}
	}
})
</script>

<style lang="sass">
.editor-wrapper
	display: flex
	flex-flow: column nowrap
	height: 100%
	width: 100%
	overflow: hidden
.editor-container
	min-width: 300px
	height: 100%
	.monaco-editor
		border: 1px var(--color-surface-1) solid
		.overflow-guard
			overflow-y: hidden

.monaco-editor
	.breakpoint, .hover-breakpoint
		cursor: pointer
	.hover-breakpoint::after, .breakpoint::after
		content: ''
		width: 10px
		height: 10px
		border: 1px solid var(--color-system-error)
		background-color: color-mix(in srgb, var(--color-system-error), var(--color-surface-0) 90%)
		border-radius: 50%
		display: inline-block
		cursor: pointer
		// opacity: 0.2
	.breakpoint::after
		background-color: var(--color-system-error)
		opacity: 1
	.run-line::after
		content: ''
		position: absolute
		right: 2ch
		font-size: 0.8em
		// border-radius: 5px
		padding: 2px 2px
		line-height: 0.9em
	.run-line
		border: 2px solid
	.run-line-stage-0
		border-color: #FFD70030
		&::after
			background-color: #FFD70030
			content: 'IF'
	.run-line-stage-1
		border-color: #00FF0030
		&::after
			background-color: #00FF0030
			content: 'ID'
	.run-line-stage-2
		border-color: #fa807230
		&::after
			background-color: #fa807230
			content: 'EX'
	.run-line-stage-3
		border-color: #87ceeb30
		&::after
			background-color: #87ceeb30
			content: 'MEM'
	.run-line-stage-4
		border-color: #ff69b430
		&::after
			background-color: #ff69b430
			content: 'WB'
</style>
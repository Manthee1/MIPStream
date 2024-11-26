<script setup lang="ts">

</script>

<template>
    <div ref="editor" class="editor-container">
        <!-- <div id="editor" ref="editor" theme="vs" :options="options" v-model:value="$dlxStore.program" </div> -->
        <!-- <div id="editor" ref="editor"> </div> -->
    </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { default as monaco, validate } from "../../config/monaco";

export default defineComponent({
	data() {
		return {
			decorations: [] as string[],
			hoverDecorations: [] as string[],
			breakpoints: [] as number[],
		}
	},
	props: {
		modelValue: String
	},

	mounted() {
		const editorEl = this.$refs.editor as HTMLElement;
		const editor = monaco.editor.create(editorEl, {
			language: 'asm',
			minimap: {
				enabled: true
			},
			automaticLayout: true,
			theme: 'dlx',
			padding: {
				top: 10,
				bottom: 10
			},
			value: this.modelValue,
			parameterHints: {
				enabled: true
			},
			glyphMargin: true,
			lineNumbersMinChars: 2,
			suggest: {
				snippetsPreventQuickSuggestions: false,
				showSnippets: true,
				preview: true,
			}
		});
		const model = monaco.editor.getModels()[0];
		validate(model);



		// Listener for changes in the editor
		this.$dlxStore.program = monaco.editor.getModels()[0].getValue();
		monaco.editor.getModels()[0].onDidChangeContent(() => {
			const code = monaco.editor.getModels()[0].getValue();
			this.$dlxStore.program = code;
			this.$emit('update:modelValue', code);
			validate(model);
		});

		editor.onMouseDown((e) => {
			console.log('Mouse Down', e);

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
	methods: {
		handleMouseMove(e: monaco.editor.IEditorMouseEvent) {
			if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
				const lineNumber = e.target.position.lineNumber;
				const model = monaco.editor.getModels()[0];
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
			const model = monaco.editor.getModels()[0];
			this.hoverDecorations = model.deltaDecorations(this.hoverDecorations, []);
		},


		updateBreakpoints() {
			const model = monaco.editor.getModels()[0];
			const decorations = model.deltaDecorations(this.decorations, this.breakpoints.map(line => ({
				range: new monaco.Range(line, 1, line, 1),
				options: {
					isWholeLine: true,
					glyphMarginClassName: 'breakpoint'
				}
			})));
			this.decorations = decorations;
		},

		toggleBreakpoint(line: number) {
			if (this.breakpoints.includes(line)) {
				this.removeBreakpoint(line);
			} else {
				this.addBreakpoint(line);
			}
			console.log('Breakpoints:', this.breakpoints);

		},
		addBreakpoint(line: number) {
			this.breakpoints.push(line);
			this.updateBreakpoints();
		},
		removeBreakpoint(line: number) {
			this.breakpoints = this.breakpoints.filter(b => b !== line);
			this.updateBreakpoints();
		}
	}
})
</script>
<style lang="sass">
.editor-container
    min-width: 300px
    flex: 1 1 auto
    width: 100%
    height: 100%
    .monaco-editor
        border: 1px var(--color-light) solid
        overflow-y: visible
.monaco-editor
    .hover-breakpoint::after, .breakpoint::after
        content: ''
        background-color: var(--color-system-error)
        width: 10px
        height: 10px
        border-radius: 50%
        display: inline-block
        cursor: pointer
        opacity: 0.2
    .breakpoint::after
        opacity: 1
</style>
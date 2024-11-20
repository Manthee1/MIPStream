<script setup lang="ts">

</script>

<template>
    <div ref="editor" class="editor-container">
        <!-- <div id="editor" ref="editor" theme="vs" :options="options" v-model:value="$dlxStore.program" </div> -->
        <!-- <div id="editor" ref="editor"> </div> -->
    </div>
</template>

<script lang="ts">

import * as monaco from 'monaco-editor';
import * as themeData from 'monaco-themes/themes/Dawn.json';

const options = {
    language: 'asm',
    minimap: {
        enabled: true
    },
    automaticLayout: true,
    theme: 'dawn',
    padding: {
        top: 10,
        bottom: 10
    },
    value: `ADDI R1, R0, 5
SW R1, 0(R0)
LW R2, 0(R0)
ADDI R3, R0, 10
HALT`

}
export default {
    data() {
        return {
            options: options
        }
    },
    mounted() {
        const editorEl = this.$refs.editor as HTMLElement;
        monaco.editor.create(editorEl, options);
        monaco.editor.defineTheme('monokai', themeData as monaco.editor.IStandaloneThemeData);
        monaco.editor.setTheme('monokai');
        // Listener for changes in the editor
        this.$dlxStore.program = monaco.editor.getModels()[0].getValue();
        monaco.editor.getModels()[0].onDidChangeContent(() => {
            console.log('Content changed');
            console.log(monaco.editor.getModels()[0].getValue());
            this.$dlxStore.program = monaco.editor.getModels()[0].getValue();
        });
    }

}
</script>
<style lang="sass">
.editor-container
    min-width: 300px
    flex: 1 1 auto
    width: 100%
    height: 100%
    .monaco-editor
        border: 1px var(--color-main-200) solid
        border-radius: 5px
        overflow: hidden
</style>
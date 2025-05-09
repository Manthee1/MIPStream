<script setup lang="ts">
import GeneralHelp from '../../assets/help/general.md';
import RegistersHelp from '../../assets/help/registers.md';
import KeyboardShortuctsHelp from '../../assets/help/keyboard-shortcuts.md';
import { ComponentOptions } from 'vue';
import '../../assets/sass/components/tab-window.scss'



const helpTabs: Array<{ name: string; icon: string, component: ComponentOptions }> = [
    { name: "General", icon: "help-circle", component: GeneralHelp },
    { name: "Registers", icon: "columns", component: RegistersHelp },
    { name: "Shortcuts", icon: "corner-right-up", component: KeyboardShortuctsHelp },
    // { name: "Memory", icon: "cpu", component: MemoryHelp },
    // { name: "Diagram", icon: "cpu", component: DiagramHelp },
    // { name: "Hex View", icon: "cpu", component: HexViewHelp },
    // { name: "Instructions", icon: "cpu", component: InstructionsHelp },
    // { name: "Instruction Config", icon: "cpu", component: InstructionConfigHelp },
    // { name: "Troubleshooting", icon: "alert-triangle", component: GeneralHelp },
];

</script>


<template>
    <div class="help-window flex flex-row flex-nowrap gap-2">
        <div class="tabs">
            <span class="tab-item" v-for="(tab, index) in helpTabs" :key="'help-tab-' + index"
                @click="setActiveTab(index)" :class="{ active: currentTabIndex === index }">
                <vue-feather class="tab-icon" :type="tab.icon" />
                <span class='tab-name'> {{ tab.name }}</span>
            </span>
        </div>
        <template v-for="(tab, index) in helpTabs" :key="'help-tab-content-' + index">
            <div class="tab-content" v-if="currentTabIndex === index">
                <component :is="tab.component" />
            </div>
        </template>
    </div>
</template>

<script lang="ts">
export default {
    name: "HelpWindow",

    data() {
        return {
            currentTabIndex: 0,
        };
    },

    methods: {
        setActiveTab(index: number) {
            console.log("Setting active tab to: ", index);
            this.currentTabIndex = index;
        },
    },

};
</script>

<style scoped lang="scss">
.help-window {
    min-width: 300px;
    min-height: 300px;
    height: 80vh;
    width: 70vw;
    max-width: 90vw;
    overflow: auto;

    .tab-content .markdown-body {
        padding: 0rem 2rem;
        margin-right: 2rem;
        border-radius: 0.5rem;

        background-color: var(--color-surface-0);
    }

}
</style>


<style lang="scss">
.tab-content .markdown-body {
    // Styles for markdown content
    // font-family: Arial, sans-serif;
    line-height: 1.6;
    color: var(--color-text);

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        font-weight: bold;
        margin: 1em 0 0.5em;
    }

    h1 {
        font-size: 2em;
    }

    h2 {
        font-size: 1.5em;
    }

    h3 {
        font-size: 1.2em;
    }

    h4 {
        font-size: 1.1em;
    }

    h5 {
        font-size: 1em;
    }

    h6 {
        font-size: 0.9em;
    }

    p {
        margin: 0.5em 0;
        color: var(--color-text);
    }

    ul,
    ol {
        list-style-position: outside;
        list-style-type: disc;
        margin: 0.5em 0 0.5em 1.5em;
        padding: 0;
    }

    li {
        margin: 0.3em 0;
    }

    a {
        color: var(--color-system-info);
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    code {
        font-family: 'Courier New', Courier, monospace;
        background-color: var(--color-surface-1);
        padding: 0.2em 0.4em;
        border-radius: 4px;
        color: var(--color-text);
        font-weight: 600;
    }

    pre {
        font-family: 'Courier New', Courier, monospace;
        background-color: var(--color-surface-1);
        padding: 1em;
        border-radius: 4px;
        overflow: auto;
    }

    blockquote {
        margin: 0.5em 0;
        padding: 0.5em 1em;
        background-color: var(--color-surface-1);
        border-left: 4px solid var(--color-surface-2);
        font-style: italic;
    }

}
</style>
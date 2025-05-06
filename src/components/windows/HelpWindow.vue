<script setup lang="ts">
import GeneralHelp from '../../assets/help/general.md';
import RegistersHelp from '../../assets/help/registers.md';
import { ComponentOptions } from 'vue';



const helpTabs: Array<{ name: string; icon: string, component: ComponentOptions }> = [
    { name: "General", icon: "help-circle", component: GeneralHelp },
    { name: "Registers", icon: "columns", component: RegistersHelp },
    // { name: "Shortcuts", icon: "corner-right-up", component: GeneralHelp },
    // { name: "Troubleshooting", icon: "alert-triangle", component: GeneralHelp },
];

</script>


<template>
    <div class="help-window flex flex-row flex-nowrap gap-2">
        <div class="tabs">
            <button class="tab-item flex flex-left gap-2 p-2" v-for="(tab, index) in helpTabs"
                :key="'help-tab-' + index" @click="setActiveTab(index)" :class="{ active: currentTabIndex === index }">
                <vue-feather class="tab-icon" :type="tab.icon" />
                <span class='tab-name'> {{ tab.name }}</span>
            </button>
        </div>
        <div class="tab-content" v-for="(tab, index) in helpTabs" :key="'help-tab-content-' + index">
            <component :is="tab.component" v-show="currentTabIndex === index" />
        </div>
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
    padding: 20px;

    .tab-content {
        margin-top: 1rem;
        min-width: 300px;
        min-height: 300px;
        height: 80vh;
        width: 50vw;
        max-width: 90vw;
        overflow: auto;
        padding: 1rem
    }
}
</style>

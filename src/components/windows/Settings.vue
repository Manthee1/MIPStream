<template>
    <div class="settings-content">
        <div class="tabs">
            <div class="tab-item" v-for="(tab, index) in settingsTabs" :key="'settings-tab-' + index"
                @click="setActiveTab(index)">
                <vue-feather :type="tab.icon" />
                <span> {{ tab.name }}</span>
            </div>
        </div>
        <div class="tab-content">
            <div class="setting-item" v-for="setting in currentTab.settings" :key="setting.key">
                <label>{{ setting.label }}</label>
                <div v-if="setting.type === 'text'">
                    <input type="text" v-model="$settings[setting.key]" />
                </div>
                <div v-else-if="setting.type === 'number'">
                    <input type="number" v-model="$settings[setting.key]" />
                </div>
                <div v-else-if="setting.type === 'checkbox'">
                    <input type="checkbox" v-model="$settings[setting.key]" />
                </div>
                <div v-else-if="setting.type === 'select'">
                    <select v-model="$settings[setting.key]">
                        <option v-for="option in setting.options" :key="option.value" :value="option.value">{{
                            option.label }}</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { settingTabs } from '../../config/settings';
import Window from '@/components/common/Window.vue';

export default defineComponent({
    name: 'Settings',
    components: {
        Window,
    },
    data() {
        return {
            currentTabIndex: 0,
        };
    },
    computed: {
        settingsTabs() {
            return settingTabs;
        },
        currentTab() {
            return settingTabs[this.currentTabIndex];
        },
    },
    methods: {
        close() {
            this.$viewStore.toggleSettings();
        },
        setActiveTab(index: number) {
            this.currentTabIndex = index;
        },
    },
});
</script>

<style scoped lang="sass">


.settings-content
    display: flex
    flex-flow: row nowrap
    justify-content: flex-start
    align-content: flex-start
    min-width: 500px
    min-height: 300px
    
    .tabs
        display: flex
        flex-direction: row
        margin-bottom: 10px
        height: 100%

        .tab-item
            display: flex
            flex-flow: row nowrap
            align-items: center
            gap: 0.5rem
            padding: 0.8rem 0.5rem
            cursor: pointer
            background-color: #e0e0e0

    .tab-content
        display: flex
        flex-flow: column nowrap
        gap: 1rem
        padding: 1rem
        width: 100%
        height: 100%

        .setting-item
            display: flex
            flex-flow: row nowrap
            align-items: center
            gap: 1rem
            padding: 0.5rem
            border-radius: 5px
            background-color: #f0f0f0

            label
                font-weight: bold
                width: 150px
                text-align: right

            input, select
                padding: 0.5rem
                border-radius: 5px
                border: 1px solid #ccc
                width: 200px
                font-size: 1rem
                outline: none
                &[type="checkbox"]
                    width: auto
                    padding: 0.2rem
        
            
            

            

</style>
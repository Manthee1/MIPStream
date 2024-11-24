<template>
    <div class="settings-content">
        <div class="tabs">
            <div class="tab-item" v-for="(tab, index) in settingsTabs" :key="'settings-tab-' + index"
                @click="setActiveTab(index)" :class="{ active: currentTabIndex === index }">
                <vue-feather class="tab-icon" :type="tab.icon" />
                <span class='tab-name'> {{ tab.name }}</span>
            </div>
        </div>
        <div class="tab-content">
            <div class="setting-item" v-for="setting in currentTab.settings" :key="setting.key">
                <div class='setting-icon-wrapper'>
                    <vue-feather v-if="setting?.icon" class="setting-icon" :type="setting.icon" />
                </div>
                <div class="setting-info">
                    <label class='setting-name'>{{ setting.label }}</label>
                    <p class="setting-description">{{ setting.description }}</p>
                </div>
                <div class="setting-input">
                        <input v-if="setting.type === 'text'" type="text" :value="$settings[setting.key]"
                            @input="setSetting(setting.key, $event)" />
                        <input v-else-if="setting.type === 'number'" type="number" :value="$settings[setting.key]"
                            @input="setSetting(setting.key, $event)" />
                        <Switch v-else-if="setting.type === 'checkbox'" :id="setting.key" :model-value="$settings[setting.key]"
                            @update:model-value="setSetting(setting.key, $event)" />
                        <Select v-else-if="setting.type === 'select'" :id="setting.key" :model-value="$settings[setting.key]" :options="setting.options"
                            @update:model-value="setSetting(setting.key, $event)" />
                </div>
            </div>
        </div>
    </div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { settingTabs } from '../../config/settings';
import Window from '@/components/common/Window.vue';
import Switch from '../common/Switch.vue';
import Select from '../common/MSelect.vue';
import { saveSetting } from '../../storage/settingsStorage';

export default defineComponent({
    name: 'Settings',
    components: {
        Window,
        Switch,
        Select,
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
        setSetting(key: string, value: any) {
            console.log(key, value);
            if (key === 'theme') this.$viewStore.setTheme(value);
            
            this.$settings.setSetting(key, value);
        },
    },
    watch: {
        $settings() {
            console.log('Settings changed');
            // saveSetting();
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
    min-width: 300px
    min-height: 300px
    height: 80vh
    width: 50vw
    max-width: 90vw
    
    .tabs
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: flex-start
        margin-bottom: 10px
        height: 100%
        min-width: 25rem
        padding: 1rem
        background-color: var(--color-white)
        border-right: 1px solid var(--color-medium)

        .tab-item
            display: flex
            flex-flow: row nowrap
            align-items: center
            gap: 1rem
            height: auto
            width: 100%
            border-radius: 5px
            margin: 0.5rem
            padding: 0.8rem 2rem
            cursor: pointer
            // color: var(--color-subtext)
            &:hover
                background-color: var(--color-light)
            &.active
                background-color: var(--color-light)
                color: var(--color-regular)
            

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
            justify-content: space-between
            gap: 2rem
            padding: 1rem 2rem
            border-radius: 5px
            background-color: var(--color-white)
            border: 1px solid var(--color-medium)
            transition: background-color 0.2s
            &:hover
                background-color: var(--color-background-dark)
            .setting-icon-wrapper .setting-icon
                font-size: 1.5rem
            .setting-info
                display: flex
                flex-flow: column nowrap
                gap: 0rem
                width: 100%
                flex: 1 1 auto
                .setting-name
                    color: var(--color-regular)
                    font-weight: bold
                    margin: 0
                .setting-description
                    color: var(--color-subtext)
                    margin: 0.2rem 0
                    max-width: 50rem

            .setting-input
                display: flex
                flex-flow: row nowrap
                align-items: center
                gap: 0.5rem
                // flex: 0 0 0
                max-width: 20rem
            
            

            

</style>
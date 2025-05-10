<template>
    <div class="settings-content">
        <div class="tabs">
            <div class="tab-item" v-for="(tab, index) in settingsConfig.tabs" :key="'settings-tab-' + index"
                @click="setActiveTab(index)" :class="{ active: currentTabIndex === index }">
                <vue-feather class="tab-icon" :type="tab.icon" />
                <span class='tab-name'> {{ tab.name }}</span>
            </div>
        </div>
        <div class="tab-content">
            <div class="setting-item" :class="{ 'wrap': setting.type === 'radio', 'error': errors[setting.key] }"
                v-for="setting in currentTab.settings" :key="setting.key">
                <div class="setting-info">
                    <div class='setting-icon-wrapper'>
                        <vue-feather v-if="setting?.icon" class="setting-icon" :type="setting.icon" />
                    </div>
                    <div class="setting-text">
                        <label class="setting-name">{{ setting.label }} <small class="font-light ml-2"
                                v-if="setting.type === 'number'">|&nbsp; {{ setting.min ?? 0 }} to {{ setting.max ?? 100
                                }}
                            </small></label>
                        <p class="setting-description">{{ setting.description }}</p>
                    </div>
                </div>
                <div class="setting-input">
                    <input v-if="setting.type === 'text'" type="text" :value="settings[setting.key]"
                        @input="setSetting(setting.key, ($event.target as HTMLInputElement)?.value)" />
                    <input v-else-if="setting.type === 'number'" type="number" :value="settings[setting.key]"
                        :min="setting.min ?? 0" :max="setting.max ?? 100" :step="setting.step ?? 1" :id="setting.key"
                        @input="setSetting(setting.key, parseInt(($event.target as HTMLInputElement)?.value))" />
                    <Switch v-else-if="setting.type === 'checkbox'" :id="setting.key"
                        :model-value="settings[setting.key]" @update:model-value="setSetting(setting.key, $event)" />
                    <Select v-else-if="setting.type === 'select'" :id="setting.key" :model-value="settings[setting.key]"
                        :options="setting?.options ?? []" @update:model-value="setSetting(setting.key, $event)" />
                    <div class="width-full" v-else-if="setting.type === 'radio'">
                        <template v-for="option in setting.options" :key="setting.key + '-' + option.value">
                            <label class="radio-group flex flex-row flex-nowrap flex-left gap-3"
                                :for="setting.key + '-' + option.value"
                                :class="{ 'active': settings[setting.key] == option.value }">
                                <input class="" type='radio' :checked="settings[setting.key] == option.value"
                                    :name="setting.key" :value="option.value" :id="setting.key + '-' + option.value"
                                    @change="setSetting(setting.key, option.value)" />
                                <div class="flex flex-column">
                                    {{ option.label }}
                                    <p v-if="option.description">{{ option.description }}</p>

                                </div>

                            </label>
                        </template>
                    </div>
                </div>
                <!-- Error icon -->
                <div v-show="errors[setting.key]" class="setting-error">
                    <vue-feather type="alert-triangle" class="icon" :title="errors[setting.key]" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, toRef } from 'vue';
import Window from '@/components/common/Window.vue';
import Switch from '../common/Switch.vue';
import Select from '../common/MSelect.vue';
import { clone } from '../../assets/js/utils';
import '../../assets/sass/components/tab-window.scss'

export default defineComponent({
    name: 'Settings',
    components: {
        Window,
        Switch,
        Select,
    },
    props: {
        settingsConfig: {
            type: Object as () => SettingWindowConfig,
            required: true,
        },

    },
    data() {
        return {
            currentTabIndex: 0,
            errors: {} as { [key: string]: string; },
            settings: clone(this.settingsConfig.settings)
        };
    },
    mounted() {
        this.currentTabIndex = this.settingsConfig.activeTabIndex;
    },
    watch: {
        settingsConfig: {
            handler(newValue) {
                this.settings = clone(newValue.settings);
                this.currentTabIndex = newValue.activeTabIndex;
            },
            deep: true,
        },
    },
    computed: {
        currentTab() {
            if (!this.settingsConfig?.tabs) return { name: '', settings: [], icon: '', };
            return this.settingsConfig?.tabs[this.currentTabIndex];
        },
    },
    methods: {
        close() {
            this.$UIStore.closeSettings();
        },
        setSetting(key: string, value: any) {
            console.log('Setting', key, value);
            this.settings[key] = value
            // Find the settingsConfig for the key
            // If the key is not in the settingsConfig, return

            let settingConfig = this.settingsConfig.tabs
                .flatMap((tab) => tab.settings)
                .find((setting) => setting.key === key);

            if (!settingConfig) {
                this.errors[key] = `Setting "${key}" not found in settingsConfig.`;
                return;
            }

            // If its a number, Make sure its within its min, max and step
            if (settingConfig.type === 'number') {
                if ((settingConfig.min && settingConfig.max && settingConfig.step) && (value < settingConfig?.min || value > settingConfig?.max || (value - settingConfig?.min) % settingConfig?.step != 0)) {
                    this.errors[key] = `Invalid value for setting "${key}". Value must be between ${settingConfig.min} and ${settingConfig.max}, and follow the step of ${settingConfig.step}.`;
                    return;
                }
            }

            delete this.errors[key];
            this.settingsConfig.settings[key] = value;
            this.settingsConfig.setSetting(key, value);
        },
        setActiveTab(index: number) {
            this.settingsConfig.activeTabIndex = index;
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
    min-width: 800px
    min-height: 300px
    height: 80vh
    width: 50vw
    max-width: 90vw
    .tab-content

        .setting-item
            position: relative
            display: flex
            flex-flow: row nowrap
            align-items: center
            justify-content: space-between
            gap: 2rem
            padding: 1rem 2rem
            margin-right: 1rem
            border-radius: 5px
            background-color: var(--color-surface-0)
            border: 2px solid var(--color-surface-2)
            transition: background-color 0.2s
            &.error
                border: 2px solid var(--color-system-error)
                // color: var(--color-surface-0)
                .setting-error
                    position: absolute
                    right: 2rem
                    color: var(--color-system-error)
                    flex-flow: column
                    justify-content: flex-start
                    align-content: flex-start
            // &:hover
            //     background-color: var(--color-background-dark)
            &.wrap
                flex-flow: column
                justify-content: flex-start
                align-content: flex-start
                .setting-input
                    max-width: 100%
            .setting-info
                display: flex
                flex-flow: row nowrap
                gap: 1rem
                width: 100%
                flex: 1 1 auto
                .setting-icon-wrapper
                    display: flex
                    justify-content: center
                    align-content: center
                    font-size: 1.5rem
                    .setting-icon
                        margin: auto
                .setting-text
                    .setting-name
                        color: var(--color-text)
                        font-weight: bold
                        margin: 0
                    .setting-description
                        color: var(--color-subtext)
                        font-size: 1.3rem
                        text-align: justify;
                        margin: 0.2rem 0.1rem
                        max-width: 50rem

            .setting-input
                display: flex
                flex-flow: row nowrap
                align-items: center
                gap: 0.5rem
                // flex: 0 0 0
                max-width: 20rem
                width: 100%
                .radio-group 
                    width: 100%
                    border-radius: 5px
                    padding: 0.5rem
                    cursor: pointer
                    &.active
                        background-color: var(--color-surface-1)
                    &:hover
                        background-color: var(--color-surface-1)
                    input
                        margin: 0px 0.5rem 
                        
                    p
                        margin: 0
                        font-size: 1.2rem
                        color: var(--color-subtext) 
              
</style>
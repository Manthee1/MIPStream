<template>
    <div class="top-bar">
        <Dropdown compact :items="dropdownItems" label="" icon="menu" />
        <span class="file-name">DLXSim - {{ fileName }}</span>
        <!-- Theme -->
        <div class="flex">
            <MButton :icon="$viewStore.theme === 'light' ? 'sun' : 'moon'" @click="$viewStore.toggleTheme" />
            <MButton icon="cpu" @click="toggleView" class="toggle-view" :class="{ active: showCpuView }" />
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import Dropdown from '@/components/common/Dropdown.vue';
import MButton from '@/components/common/MButton.vue';
export default defineComponent({
    name: 'TopBar',
    components: {
        MButton,
        Dropdown
    },
    data() {
        return {
            dropdownItems: [
                {
                    label: 'New',
                    action: () => {
                        console.log('New clicked');
                    }
                },
                {
                    label: 'Open',
                    action: () => {
                        console.log('Open clicked');
                    }
                },
                {
                    label: 'Open Recent',
                    action: () => {
                        console.log('Open clicked');
                    },
                    type: 'submenu',
                    items: [
                        {
                            label: 'File 1',
                            action: () => {
                                console.log('File 1 clicked');
                            }
                        },
                        {
                            label: 'File 2',
                            action: () => {
                                console.log('File 2 clicked');
                            }
                        },
                        {
                            label: 'File 3',
                            action: () => {
                                console.log('File 3 clicked');
                            }
                        }
                    ]
                },
                {
                    label: 'Save',
                    action: () => {
                        console.log('Save clicked');
                    }
                },
                {
                    label: 'Save As',
                    action: () => {
                        console.log('Save As clicked');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Settings',
                    action: () => {
                        this.$viewStore.toggleSettings();
                    }
                },
                {
                    label: 'Help',
                    action: () => {
                        console.log('Help clicked');
                    }
                },
                {
                    label: 'About',
                    action: () => {
                        console.log('About clicked');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Exit',
                    action: async () => {
                        console.log('Exit clicked');
                        const confirmed = await this.$confirm('Are you sure you want to exit? 🥺',null,'Exit', 'Stay');
                    }
                }
            ]
        }
    },
    props: {
        fileName: {
            type: String,
            required: true
        }
    },
    computed: {
        showCpuView() {
            return this.$viewStore.showCpuView;
        }
    },
    methods: {
        toggleView() {
            this.$viewStore.toggleCpuView();
        }
    }
})
</script>

<style lang="sass" scoped>
.top-bar 
    display: flex
    justify-content: space-between
    align-items: center
    background-color: var(--color-background)
    color: var(--color-regular)
    padding: 0em 0.4em

    .hamburger-menu,
    .toggle-view 
        background: none
        border: none
        color: var(--color-regular)
        font-size: 20px
        cursor: pointer
        &.active
            background-color: var(--color-light)
            border-radius: 1em

    .file-name 
        font-size: 16px

</style>
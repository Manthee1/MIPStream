<template>
    <div class="top-bar">
        <Dropdown compact :items="dropdownItems" label="" icon="menu" />
        <span class="file-name">{{ title }}</span>
        <!-- Theme -->
        <div class="flex gap-2">
            <MButton :icon="$UIStore.theme === 'light' ? 'sun' : 'moon'" @click="togleTheme()" />
            <MButton small v-if="$route?.name && $route.name == 'Workspace'" icon="cpu" @click="toggleView" class="toggle-view" :class="{ active: showCpuView }" />
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
            
        }
    },
    computed: {
        dropdownItems(){
            return this.$UIStore.topBar.dropdownItems;
        },
        title() {
            return this.$UIStore.topBar.title;
        },
        showCpuView() {
            return this.$UIStore.showCpuView;
        }
    },
    methods: {
        toggleView() {
            this.$UIStore.toggleCpuView();
        },
        togleTheme() {
            const newTheme = this.$UIStore.theme === 'light' ? 'dark' : 'light';
            this.$settings.setSetting('theme',newTheme);
            this.$UIStore.setTheme(newTheme);
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
    color: var(--color-text)
    padding: 0em 0.4em
    height: var(--topbar-height)
    border-bottom: 2px solid var(--color-accent)

    .hamburger-menu,
    .toggle-view 
        background: none
        border: none
        color: var(--color-text)
        font-size: 20px
        cursor: pointer
        transition: all 0.1s linear
        &.active
            color: var(--color-accent)
        &:hover
            background-color: var(--color-light)
    

    .file-name 
        font-size: 16px

</style>
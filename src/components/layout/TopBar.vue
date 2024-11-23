<template>
    <div class="top-bar">
        <Dropdown compact :items="dropdownItems" label="" icon="menu" />
        <span class="file-name">{{ title }}</span>
        <!-- Theme -->
        <div class="flex">
            <MButton :icon="$viewStore.theme === 'light' ? 'sun' : 'moon'" @click="$viewStore.toggleTheme" />
            <MButton v-if="$route?.name && $route.name == 'Workspace'" icon="cpu" @click="toggleView" class="toggle-view" :class="{ active: showCpuView }" />
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
            return this.$viewStore.topBar.dropdownItems;
        },
        title() {
            return this.$viewStore.topBar.title;
        },
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
    height: var(--topbar-height)
    border-bottom: 2px solid var(--color-regular)

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
<template>
    <TopBar fileName="Test" />
    <main>
        <router-view v-slot="{ Component }">
            <transition name="fade">
                <component :is="Component" />
            </transition>
        </router-view>
    </main>
    <div class="settings-wrapper" v-if="$UIStore.showSettings" @click="$UIStore.closeSettings">
        <Window :title="$UIStore.settingsWindowConfig.title" @click.stop class="settings-window" closeable
            :onClose="$UIStore.closeSettings">
            <Settings :settings-config="$UIStore.settingsWindowConfig"
                :settings="$UIStore.settingsWindowConfig.settings" />
        </Window>
    </div>

    <div class="help-window-wrapper" v-if="$UIStore.showHelp" @click="$UIStore.closeHelp">
        <Window title="Help" @click.stop closeable :onClose="$UIStore.closeHelp">
            <HelpWindow />
        </Window>
    </div>


    <!-- Modal -->
    <Modal />

    <!-- DropdownMenu -->
    <DropdownMenu />

    <!-- Notifications -->
    <notifications position="bottom left" :pauseOnHover='true' />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TopBar from '@/components/layout/TopBar.vue';
import Settings from './components/windows/Settings.vue';
import Window from './components/common/Window.vue';
import Modal from './components/singletons/Modal.vue';
import DropdownMenu from './components/common/DropdownMenu.vue';
import HelpWindow from './components/windows/HelpWindow.vue';

export default defineComponent({
    name: 'App',
    components: {
        TopBar,
        Settings,
        Window,
        Modal,
        DropdownMenu,
        HelpWindow
    },
});
</script>


<style lang="sass">
@use './assets/sass/main'

.settings-wrapper, .help-window-wrapper
    position: absolute
    top: 0
    left: 0
    width: 100%
    height: 100%
    background-color: var(--color-overlay)
    display: flex
    justify-content: center
    align-items: center
    z-index: 100


// Transition
.fade-enter-active, .fade-leave-active
    transition: opacity 0.2s
.fade-enter, .fade-leave-to
    opacity: 0
.vue-notification-group .vue-notification 
    background: var(--color-system-info)
    border-left: 5px solid var(--color-system-info-dark)
    &.success 
        background: var(--color-system-success)
        border-left-color: var(--color-system-success-dark)

    &.warn 
        background: var(--color-system-warning)
        border-left-color: var(--color-system-warning-dark)

    &.error 
        background: var(--color-system-error)
        border-left-color: var(--color-system-error-dark)


</style>

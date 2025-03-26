<script setup lang="ts">
import { generalSettingTabs, projectSettingTabs } from './config/settings';

</script>


<template>
    <TopBar fileName="Test" />
    <main>
        <router-view v-slot="{ Component }">
            <transition name="fade">
                <component :is="Component" />
            </transition>
        </router-view>
    </main>
    <div class="settings-wrapper" v-if="$UIStore.showSettings">
        <Window title="Settings" class="settings-window" closeable :onClose="$UIStore.toggleSettings">
            <Settings :settings-tabs="generalSettingTabs" :set-setting="$settings.setSetting" />
        </Window>
    </div>

    <div class="project-settings-wrapper" v-if="$UIStore.showProjectSettings">
        <Window title="Project Settings" class="project-settings-window" closeable
            :onClose="$UIStore.toggleProjectSettings">
            <Settings :settings-tabs="projectSettingTabs" :set-setting="$projectStore.setProjectSetting" />
        </Window>
    </div>
    <!-- Modal -->
    <Modal />

    <!-- Notifications -->
    <notifications position="bottom left" :pauseOnHover='true' />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TopBar from '@/components/layout/TopBar.vue';
import Settings from './components/windows/Settings.vue';
import Window from './components/common/Window.vue';
import Modal from './components/singletons/Modal.vue';

export default defineComponent({
    name: 'App',
    components: {
        TopBar,
        Settings,
        Window,
        Modal,
    },
});
</script>


<style lang="sass">
@use './assets/sass/main'

.settings-wrapper, .project-settings-wrapper
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
</style>

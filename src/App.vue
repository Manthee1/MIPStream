<template>
    <TopBar fileName="Test"/>
    <main>
        <router-view />
    </main>
        <div class="settings-wrapper" v-if="$viewStore.showSettings">
        <Window title="Settings" class="settings-window" closeable :onClose="$viewStore.toggleSettings">
            <Settings />
        </Window>
    </div>

    <!-- Confrim Modal -->
    <ConfirmModal />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TopBar from '@/components/layout/TopBar.vue';
import Settings from './components/windows/Settings.vue';
import Window from './components/common/Window.vue';
import ConfirmModal from './components/common/ConfirmModal.vue';

export default defineComponent({
    name: 'App',
    components: {
        TopBar,
        Settings,
        Window,
        ConfirmModal,
    },
});
</script>


<style lang="sass">
@use './assets/sass/main'

.settings-wrapper
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


</style>

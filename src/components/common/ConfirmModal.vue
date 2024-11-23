<template>
    <transition name="fade-scale">
        <div v-show="show" class="confirm-modal">
            <div class="confirm-modal-content">
                <MButton @click="cancelAction" class="close-button" icon='x' />
                <div class="confirm-modal-header">
                    <h3>{{ title }}</h3>
                </div>
                <div class="confirm-modal-body">
                    <p>{{ message }}</p>
                </div>
                <div class="confirm-modal-footer">
                    <MButton outlined @click="cancelAction">{{ cancelText }}</MButton>
                    <MButton filled @click="confirmAction">{{ confirmText }}</MButton>
                </div>
            </div>
        </div>
    </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MButton from '@/components/common/MButton.vue';

export default defineComponent({
    name: 'ConfirmModal',
    components: {
        MButton
    },
    computed: {
        show() {
            return this.$viewStore.confirmModal.show;
        },
        title() {
            return this.$viewStore.confirmModal.title;
        },
        message() {
            return this.$viewStore.confirmModal.message;
        },
        onConfirm() {
            return this.$viewStore.confirmModal.onConfirm;
        },
        confirmText() {
            return this.$viewStore.confirmModal.confirmText;
        },
        onCancel() {
            return this.$viewStore.confirmModal.onCancel;
        },
        cancelText() {
            return this.$viewStore.confirmModal.cancelText;
        }
    },
    methods: {
        confirmAction() {
            this.onConfirm();
        },
        cancelAction() {
            this.onCancel();
        }
    }
});
</script>

<style lang="sass" scoped>
.confirm-modal
    display: flex
    position: fixed
    top: 0
    left: 0
    right: 0
    bottom: 0
    background-color: var(--color-overlay)
    z-index: 1000
    display: flex
    justify-content: center
    align-items: center
    opacity: 1
    transition: opacity 0.1s


    .confirm-modal-content
        position: relative
        background-color: var(--color-background)
        padding: 4rem 5rem
        border: 2px solid var(--color-regular)
        border-radius: 5px
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1)
        min-width: 500px
        max-width: 800px
        scale: 1
        transition: scale 0.1s 
        .close-button
            position: absolute
            top: 1rem
            right: 1rem
    .confirm-modal-header
        display: flex
        justify-content: space-between
        align-items: center
        margin-bottom: 0rem
    
            

    .confirm-modal-body
        margin-bottom: 1rem

    .confirm-modal-footer
        display: flex
        justify-content: space-between
        margin-top: 5rem
        gap: 1rem

.fade-scale-enter-active, .fade-scale-leave-active
    opacity: 1
    .confirm-modal-content
        scale: 1

.fade-scale-enter-from, .fade-scale-leave-to
    opacity: 0
    .confirm-modal-content
        scale: 0.9
</style>
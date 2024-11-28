<template>
    <transition name="fade-scale">
        <div v-show="show" class="modal">
            <div class="modal-content">
                <MButton @click="cancelAction" class="close-button" icon='x' />
                <div class="modal-header">
                    <h3>{{ title }}</h3>
                </div>
                <div class="modal-body">
                    <p>{{ message }}</p>
                    <div v-if="type=='prompt'" class="input-wrapper">
                        <input v-model="$viewStore.modalData.input" :placeholder="inputPlaceholder" type="text" @keydown.enter="confirmAction" />
                        <span class="error" v-if="error?.trim()?.length > 0">{{ error }}</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <MButton  outlined @click="cancelAction">{{ cancelText }}</MButton>
                    <MButton accent filled @click="confirmAction">{{ confirmText }}</MButton>
                </div>
            </div>
        </div>
    </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MButton from '@/components/common/MButton.vue';

export default defineComponent({
	name: 'Modal',
	components: {
		MButton
	},
	data() {
		return {
			error: '',
		};
	},
	computed: {
		show() {
			return this.$viewStore.modalData.show;
		},
		type() {
			return this.$viewStore.modalData.type;
		},
		title() {
			return this.$viewStore.modalData.title;
		},
		message() {
			return this.$viewStore.modalData.message;
		},
		onConfirm() {
			return this.$viewStore.modalData?.onConfirm ?? (() => { });
		},
		confirmText() {
			return this.$viewStore.modalData.confirmText;
		},
		onCancel() {
			return this.$viewStore.modalData?.onCancel ?? (() => { });
		},
		cancelText() {
			return this.$viewStore.modalData.cancelText;
		},
		input() {
			return this.$viewStore.modalData.input;
		},
		inputPlaceholder() {
			return this.$viewStore.modalData.inputPlaceholder;
		},
		verifyInput() {
			return this.$viewStore.modalData?.verifyInput ?? ((input) => true);
		}
	},
	methods: {
		confirmAction() {

			console.log('confirmAction', this.$viewStore.modalData);

			if (this.type == 'prompt') {
				try {
					this.verifyInput(this.input);
				} catch (error: any) {
					this.error = error;
					return;
				}
				this.error = '';

			}

			this.onConfirm();
		},
		cancelAction() {
			this.onCancel();
		}
	}
});
</script>

<style lang="sass" scoped>
.modal
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

    .modal-content
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
    .modal-header
        display: flex
        justify-content: space-between
        align-items: center
        margin-bottom: 0rem

    .modal-body
        margin-bottom: 1rem
        .input-wrapper
            display: flex
            flex-flow: column nowrap
            gap: 0.8rem
            margin-top: 1rem

            .error
                color: var(--color-system-error)

    .modal-footer
        display: flex
        justify-content: space-between
        margin-top: 5rem
        gap: 1rem

.fade-scale-enter-active, .fade-scale-leave-active
    opacity: 1
    .modal-content
        scale: 1

.fade-scale-enter-from, .fade-scale-leave-to
    opacity: 0
    .modal-content
        scale: 0.9
</style>
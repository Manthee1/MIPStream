<template>
    <div class="window" :style="windowStyle" ref="window">
        <div class="window-header">
            <img :src="icon" alt="icon" class="window-icon" v-if="icon" />
            <span class="window-title">{{ title }}</span>
            <MButton class="close-button" icon="x" @click="onClose" v-if="closeable" />
        </div>
        <div class="window-content">
            <slot></slot>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import MButton from './MButton.vue';
export default defineComponent({
    name: 'Window',
    components: {
        MButton
    },
    props: {
        title: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: false
        },
        resizable: {
            type: Boolean,
            default: false
        },
        resizeDirections: {
            type: Array,
            default: () => ['left', 'right', 'top', 'bottom']
        },
        closeable: {
            type: Boolean,
            default: false
        },
        onClose: {
            type: Function,
            default: () => () => { }
        }
    },
    data() {
        return {
            resizing: false,
            resizeDirection: null
        };
    },
    computed: {
        windowStyle() {
            return this.resizable ? { overflow: 'auto' } : {};
        }
    },
    mounted() {
        if (this.resizable) {
            this.$el.addEventListener('mousedown', this.onMouseDown);
        }
    },
    methods: {
        onMouseDown(event) {
            const rect = this.$el.getBoundingClientRect();
            const offset = 10; // Edge offset for resizing
            if (this.resizeDirections.includes('left') && event.clientX >= rect.left && event.clientX <= rect.left + offset) {
                this.resizeDirection = 'left';
            } else if (this.resizeDirections.includes('right') && event.clientX <= rect.right && event.clientX >= rect.right - offset) {
                this.resizeDirection = 'right';
            } else if (this.resizeDirections.includes('top') && event.clientY >= rect.top && event.clientY <= rect.top + offset) {
                this.resizeDirection = 'top';
            } else if (this.resizeDirections.includes('bottom') && event.clientY <= rect.bottom && event.clientY >= rect.bottom - offset) {
                this.resizeDirection = 'bottom';
            } else {
                return;
            }
            this.resizing = true;
            const startX = event.clientX;
            const startY = event.clientY;
            const startWidth = this.$el.offsetWidth;
            const startHeight = this.$el.offsetHeight;
            const onMouseMove = event => {
                if (this.resizeDirection === 'left') {
                    this.$el.style.width = `${startWidth - (event.clientX - startX)}px`;
                } else if (this.resizeDirection === 'right') {
                    this.$el.style.width = `${startWidth + (event.clientX - startX)}px`;
                } else if (this.resizeDirection === 'top') {
                    this.$el.style.height = `${startHeight - (event.clientY - startY)}px`;
                } else if (this.resizeDirection === 'bottom') {
                    this.$el.style.height = `${startHeight + (event.clientY - startY)}px`;
                }
            };
            const onMouseUp = () => {
                this.resizing = false;
                this.resizeDirection = null;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    },
    beforeUnmount() {
        if (this.resizable) {
            this.$el.removeEventListener('mousedown', this.onMouseDown);
        }
    }
});
</script>

<style scoped lang="sass">
.window 
    border: 1px solid var(--color-light)
    border-radius: 5px
    overflow: hidden
    background-color: var(--color-background)

.window-header 
    display: flex
    align-items: center
    background-color: var(--color-background-dark)
    padding: 10px
    border-bottom: 1px solid var(--color-light)
    .close-button 
        margin-left: auto
.window-icon 
    width: 20px
    height: 20px
    margin-right: 10px

.window-title 
    font-weight: bold


</style>
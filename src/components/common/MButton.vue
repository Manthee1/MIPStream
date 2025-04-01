<template>
    <button class="m-button"
        :class="[{ 'filled': isFilled, 'outlined': isOutlined, 'small': small, 'icon-only': iconOnly, 'circle': circle }, buttonType]">
        <vue-feather :type="icon" class="icon" v-if="icon" />
        <span v-if="!iconOnly">
            <slot></slot>
        </span>
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'


export default defineComponent({
    name: 'MButton',
    components: {
    },
    data() {
        return {
            buttonType: this.type,
        }
    },
    props: {
        icon: {
            type: String,
            required: false,
        },
        outlined: {
            type: Boolean,
            default: false,
        },

        filled: {
            type: Boolean,
            default: false,
        },
        small: {
            type: Boolean,
            default: false,
        },
        circle: {
            type: Boolean,
            default: false,
        },
        accent: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: 'default' as 'default' | 'accent' | 'error' | 'success' | 'warning',
        },
    },

    computed: {
        isOutlined() {
            return this.outlined;
        },

        isFilled() {
            return this.filled;
        },

        iconOnly() {
            return (((!this.$slots.default)) && this.icon != undefined);
        }
    },
    mounted() {

        this.buttonType = this.accent ? 'type-accent' : ('type-' + this.type);

    },
});
</script>

<style scoped lang="sass">
.m-button
    display: flex
    align-items: center
    padding: 0.5em 1em
    border: none
    border-radius: 4px
    background-color: transparent
    color: var(--color-text)
    cursor: pointer
    gap: 0.5em
    transition: background-color 0.3s, color 0.3s, filter 0.3s, scale 0.1s
    &:disabled
        opacity: 0.5
        cursor: not-allowed
    &.type-accent
        --color-text: var(--color-accent)
        --color-background: var(--color-accent)
        --color-black: var(--color-accent-dark)
        --color-regular: var(--color-accent)
    &.type-error
        --color-text: var(--color-system-error)
        --color-background: var(--color-system-error)
        --color-black: var(--color-system-error-dark)
        --color-regular: var(--color-system-error)

    &:active
        scale: 0.95
    
    &.circle
        border-radius: 50%
        
    &:hover
        background-color: rgba(0, 0, 0,0.05)
        // color: var(--color-text)
        filter: brightness(1.0)
        scale: 1.05

    &.outlined
        border: 2px solid var(--color-text)
        background-color: transparent

        &:hover
            background-color: var(--color-medium)
            color: var(--color-text)


    &.filled
        background-color: var(--color-regular)
        color: var(--color-light)

        &:hover
            background-color: var(--color-black)
            color: var(--color-light)



    &.small
        padding: 0.3em 0.5em
        font-size: 0.8em
    &.icon-only
        padding: 0.5em
        &.small
            padding: 0.3em
        .icon
            margin: 0
        span
            display: none

</style>
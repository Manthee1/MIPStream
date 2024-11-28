<template>
    <button class="m-button"
        :class="{ 'filled': isFilled, 'outlined': isOutlined, 'small': small, 'icon-only': iconOnly, 'accent':accent }">
        <vue-feather :type="icon" class="icon" v-if="icon" />
        <span>
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
            iconOnly: false,
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
        accent:{
            type: Boolean,
            default: false,
        }
    },
    computed: {
        isOutlined() {
            return this.outlined;
        },

        isFilled() {
            return this.filled;
        },
    },
    mounted() {
        // Check if there is text or jsut icon
        if (!this.$slots.default) {
            this.iconOnly = true;
        }
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
    &.accent
        --color-text: var(--color-accent)
        --color-background: var(--color-accent)
        --color-black: var(--color-accent-dark)
        --color-regular: var(--color-accent)
    &:active
        scale: 0.95

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
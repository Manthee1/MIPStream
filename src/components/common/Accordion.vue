<template>
    <div class="accordion" :class="{ 'open': isOpen }">
        <div class="accordion-header" @click="toggle">
            <vue-feather :type="icon" class="icon" v-if="icon" />
            <span>{{ label }}</span>
            <vue-feather type="chevron-right" class="icon icon-cheveron" />
        </div>
        <transition name="accordion">
            <div v-show="isOpen" class="accordion-content">
                <slot></slot>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'Accordion',
    props: {
        label: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: false
        },
        open: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            isOpen: this.open
        };
    },
    methods: {
        toggle() {
            this.isOpen = !this.isOpen;
        }
    }
});
</script>

<style scoped lang="sass">
.accordion 
    max-width: 100% 
    // box-shadow: 0 0 5px rgba(0, 0, 0, 0.1)
    .accordion-header
        display: flex
        justify-content: flex-start
        gap: 0.5em
        padding: 0.2em 0.5em
        cursor: pointer
        background-color: var(--color-background-dark)
        transition: background-color 0.3s, color 0.3s
        border: 1px solid transparent
        .icon
            margin: auto 0
            width: 1em
            height: 1em
            transform: rotate(0deg)
            transition: transform 0.3s
            color: var(--color-accent)
        span
            margin: auto 0
            margin-right: auto
        &:hover
            background-color: var(--color-light)
            border-color: var(--color-accent)
    .accordion-content
        background-color: var(--color-background)
        // border-top: 1px solid var(--color-regular)
        max-height: 500px
        transition: max-height 0.3s
        overflow: auto

    .accordion-enter-active
        transition: max-height 0s
        max-height: 0px
    .accordion-leave-to
        max-height: 0
        overflow: hidden
    

    &.open
        .accordion-header
            // background-color: var(--color-medium)
            // color: var(--color-light)
            .icon-cheveron
                transform: rotate(90deg)
</style>
<template>
    <div class="m-select" :style="'min-width: ' + width" :class="{ compact, disabled }">
        <div class="select-box" @click="toggleDropdown">
            <span>{{ selectedOption?.label ?? placeholder ?? '' }}</span>
            <vue-feather type="chevron-down" class="arrow" :class="{ 'open': isOpen }" />
        </div>
        <ul v-show="isOpen" class="options" ref="list" :style="dropdownStyles">
            <li v-for="option in options" :key="option.value + '-' + option.value" @click="selectOption(option)"
                :class="{ 'selected': option.value === selectedOption?.value }">
                {{ option.label }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

type SelectOption = {
    label: string;
    value: any;
};

export default defineComponent({
    name: 'MSelect',
    props: {
        options: {
            type: Array as PropType<SelectOption[]>,
            required: true
        },
        placeholder: {
            type: String,
        },
        modelValue: {
            type: [String, Number, Boolean] as PropType<string | number | boolean>,
            default: ''
        },
        compact: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
    },
    data() {
        return {
            isOpen: false,
            selectedOption: null as SelectOption | null,
            dropdownPosition: 'bottom' as 'bottom' | 'top',
        };
    },
    computed: {
        dropdownStyles() {
            return this.dropdownPosition === 'top'
                ? { bottom: '100%', top: 'auto' }
                : { top: '100%', bottom: 'auto' };
        },
        width() {
            // make sure the width of the dropdown is the same as the largest option
            let maxWidth = Math.max(...this.options.map(option => option.label.length));
            if (this.placeholder) {
                maxWidth = Math.max(maxWidth, this.placeholder.length);
            }
            maxWidth = Math.max(maxWidth, 8); // minimum width
            return `${maxWidth + 3}ch`;
        },
    },
    mounted() {
        this.selectedOption = this.options.find(option => option.value === this.modelValue) ?? this.options[0];
        document.addEventListener('click', this.handleClickOutside);
    },

    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    },

    watch: {
        modelValue(newValue) {
            this.selectedOption = this.options.find(option => option.value === newValue) ?? this.options[0];
        },

    },
    methods: {
        toggleDropdown() {
            if (this.disabled) return;
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.$
                this.adjustDropdownPosition()
            }
        },
        selectOption(option: SelectOption) {
            this.selectedOption = option;
            this.$emit('update:modelValue', option.value);
            this.isOpen = false;
        },
        adjustDropdownPosition() {
            const rect = this.$el.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            console.log("rect", rect)
            console.log("vp", viewportHeight)

            if (rect.bottom + rect.height * this.options.length > viewportHeight) {
                this.dropdownPosition = 'top';
            } else {
                this.dropdownPosition = 'bottom';
            }
        },
        handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (!this.$el.contains(target)) {
                this.isOpen = false;
            }
        },
    }
});
</script>

<style scoped lang="sass">
.m-select
    position: relative
    width: auto
    transition: all 0.3s ease-in-out
    &.disabled
        pointer-events: none
        // opacity: 0.5
        filter: brightness(0.9);
        text-decoration: line-through;
    &.compact
        width: 100%
        .select-box
            padding: 5px
            // font-size: 0.8rem
            .arrow
                width: 1.2rem
                height: 1.2rem
                margin-left: 5px
                &.open
                    transform: rotate(180deg)
        .options
            li
                padding: 0.5rem
                font-size: 1.4rem

    .select-box
        display: flex
        justify-content: space-between
        align-items: center
        padding: 10px
        border: 1px solid var(--color-surface-3)
        background: var(--color-surface-0)
        cursor: pointer
        border-radius: 5px
        .arrow
            transition: transform 0.3s

            &.open
                transform: rotate(-180deg)

    .options
        position: absolute
        left: 0
        width: 100%
        border: 1px solid var(--color-surface-3)
        background: var(--color-surface-0)
        list-style: none
        padding: 0
        margin: 0
        z-index: 1
        box-shadow: 0px 2px 5px 2px rgba(0, 0, 0, 0.1)

        li
            padding: 1rem
            cursor: pointer

            &:hover
                background: var(--color-surface-1)
            &.selected
                background: var(--color-surface-3)
</style>
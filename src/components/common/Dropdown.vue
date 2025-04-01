<template>
    <div class="dropdown" :class="{ compact }" @click="toggleDropdown" ref="dropdown">
        <MButton class="dropdown-toggle" circle :icon="icon" />

        <DropdownMenu v-if="isOpen" :class="{ show: isOpen }" :items="items" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DropdownMenu from './DropdownMenu.vue';

import MButton from './MButton.vue';

export default defineComponent({
    name: 'Dropdown',
    components: {
        MButton,
        DropdownMenu
    },
    props: {
        label: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: false
        },
        items: {
            type: Array as () => DropdownItem[],
            required: true,
            validator: (items: DropdownItem[]) => {
                return items.every(item => (item.type === 'separator') || ('label' in item && 'action' in item));
            }
        },
        compact: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            isOpen: false
        };
    },
    methods: {
        toggleDropdown() {
            this.isOpen = !this.isOpen;
        },
        handleClickOutside(event: MouseEvent) {
            const dropdown = this.$refs.dropdown as HTMLElement;
            if (dropdown && !dropdown.contains(event.target as Node)) {
                this.isOpen = false;
            }
        }
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    }
});
</script>

<style lang="sass">
.dropdown
    position: relative

    .dropdown-toggle
        background-color: transparent
        border: none
        cursor: pointer

    .dropdown-menu
        position: absolute
        top: 100%
        left: 0
        display: none
        min-width: 12em
        padding: 0.5em 0.5em
        background-color: var(--color-background-dark)
        box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.1)
        z-index: 1000
        list-style: none
        &.show
            display: block

        .dropdown-item
            display: flex
            padding: 0.5em 0.5em
            color: var(--color-text)
            cursor: pointer
            text-decoration: none
            transition: background-color 0.3s
            gap: 0.2em
            .item-icon
                margin: auto 0
                width: 1em
                height: 1em
                margin-right: 0.3em
            >*
                margin: auto 0px
            &:hover,
            &:focus
                background-color: var(--color-medium)

        .dropdown-separator
            height: 1px
            margin: 0.5em 0
            background-color: var(--color-light)

        .dropdown-submenu
            position: relative
            >.icon
                margin: auto 0
                margin-left: auto
                width: 1em
                height: 1em
            .dropdown-menu
                position: absolute
                display: block
                top: -0.5rem
                left: 100%
                padding: 0.5em 0em
                background-color: var(--color-background-dark)
                box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.1)
                z-index: 1000
                list-style: none
.dropdown.compact
    .dropdown-menu
        padding: 0.5em 0em
        // box-shadow: none
        .dropdown-item
            padding: 0.2em 1em

</style>
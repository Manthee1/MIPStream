<template>
    <div class="dropdown" :class="{ compact }" @click.stop="toggleDropdown" ref="dropdown">
        <MButton class="dropdown-toggle" circle :icon="icon" />
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
        };
    },

    computed: {
        id() {
            return this.label.replace(/\s+/g, '-').toLowerCase();
        },
    },
    methods: {
        toggleDropdown() {
            const isOpen = (this.$UIStore.dropdownData.id == this.id) ? !this.$UIStore.dropdownData.show : true;
            this.$UIStore.dropdownData.id = this.id;
            this.$UIStore.dropdownData.show = isOpen;
            this.$UIStore.dropdownData.items = this.items;
            this.$UIStore.dropdownData.compact = this.compact;
            // Calculate x and y position of the dropdown
            const dropdown = this.$refs.dropdown as HTMLElement;
            const rect = dropdown.getBoundingClientRect();
            const x = rect.left + window.scrollX;
            const y = rect.top + window.scrollY + rect.height;
            this.$UIStore.dropdownData.x = x;
            this.$UIStore.dropdownData.y = y;

            console.log(`Dropdown conf`, this.$UIStore.dropdownData);


        },
    },
});
</script>

<style lang="sass">
.dropdown
    position: relative

    .dropdown-toggle
        background-color: transparent
        border: none
        cursor: pointer


</style>
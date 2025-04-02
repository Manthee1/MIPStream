<template>
    <div ref="dropdown-menu" :class="{ compact: $UIStore.dropdownData.compact }">
        <DropdownItems :items="items" :style="position" :class="{ show: $UIStore.dropdownData.show, }" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import DropdownItems from "./DropdownItems.vue";


export default defineComponent({
    name: "DropdownMenu",
    components: {
        DropdownItems,
    },
    data() {
        return {

        };
    },
    computed: {
        items() {
            return this.$UIStore.dropdownData.items;
        },
        position() {
            return { left: this.$UIStore.dropdownData.x + 'px', top: this.$UIStore.dropdownData.y + 'px' };
        },
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
    },

    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    },

    methods: {
        handleClickOutside(event: MouseEvent) {
            const dropdownMenu = this.$refs['dropdown-menu'] as HTMLElement;
            if (dropdownMenu && !dropdownMenu.contains(event.target as Node)) {
                this.$UIStore.dropdownData.show = false;
                this.$UIStore.dropdownData.items = [];
                this.$UIStore.dropdownData.compact = false;
                this.$UIStore.dropdownData.x = 0;
                this.$UIStore.dropdownData.y = 0;
            }
        }
    },
});
</script>

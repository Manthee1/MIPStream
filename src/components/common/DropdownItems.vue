<template>
    <ul class="dropdown-items" ref="dropdown-items" @mousemove="handleMouseMove">
        <template v-for="(item, index) in items" :key="item.label">
            <li class="dropdown-item" @click="itemClicked(item)" v-if="item.type == 'item'">
                <vue-feather v-if="item.icon" :type="item.icon" class="icon item-icon" />
                {{ item.label }}
            </li>
            <li v-else-if="item.type === 'separator'" class="dropdown-separator"></li>
            <li v-else-if="item.type === 'submenu'" class="dropdown-item dropdown-submenu">
                <vue-feather v-if="item.icon" :type="item.icon" class="icon item-icon" />
                {{ item.label }}
                <vue-feather type="chevron-right" class="icon icon-chevron" />
                <DropdownItems @mousemove="handleMouseMove" :items="item?.items ?? []"
                    v-show="index == hoverItemActiveIndex" />
            </li>
        </template>
    </ul>
</template>


<script lang="ts">
import { ComponentCustomProperties, defineComponent } from 'vue';


export default defineComponent({
    name: "DropdownItems",
    props: {
        items: {
            type: Array as () => DropdownItem[],
            required: true,
        },
    },
    data() {
        return {
            lastHoveredItemIndex: -1,
            lastHoverChange: 0,
            hoverItemActiveIndex: -1,
            activeItemTimeout: null as ReturnType<typeof setTimeout> | null,
            dropdownItems: [] as DropdownItem[],
        };
    },

    mounted() {

        this.updateItems(this.items);
    },


    watch: {
        items: {
            immediate: true,
            handler(newItems: DropdownItem[]) {
                this.updateItems(newItems);
            }
        },
    },

    methods: {

        updateItems(items: DropdownItem[]) {
            this.dropdownItems = items;
            this.dropdownItems.forEach((item: DropdownItem) => {
                item.type = item.type || 'item';
            });
            this.lastHoveredItemIndex = -1;
            this.hoverItemActiveIndex = -1;
            this.lastHoverChange = Date.now();
        },

        itemClicked(item: DropdownItem) {
            console.log(this.$context);
            // item.action 
            item.action && item.action(this.$context as unknown as ComponentCustomProperties);
            // Close the dropdown
            this.$UIStore.dropdownData.show = false;
            this.$UIStore.dropdownData.items = [];
            this.$UIStore.dropdownData.compact = false;
            this.$UIStore.dropdownData.x = 0;
            this.$UIStore.dropdownData.y = 0;

        },
        handleMouseMove(event: MouseEvent) {

            // If the mouse is moving, get the dropdown item that is being hovered and set it as the last hovered item
            const dropdownItems = (this.$refs['dropdown-items'] as HTMLElement).children;
            const hoveredItemIndex = Array.from(dropdownItems).findIndex((item: Element) => item.contains(event.target as Node));
            if (hoveredItemIndex == this.lastHoveredItemIndex) return;
            this.lastHoveredItemIndex = hoveredItemIndex;
            this.lastHoverChange = Date.now();

            if (this.activeItemTimeout) clearTimeout(this.activeItemTimeout);
            // If the hovered item is unchanged for 200ms, set it as the active item
            this.activeItemTimeout = setTimeout(() => {
                this.hoverItemActiveIndex = hoveredItemIndex;
            }, 200);
        },
    }

})

</script>

<style lang="sass" scoped>
.dropdown-items
    position: absolute
    display: none
    min-width: 12em
    padding: 0.5em 0.2em
    background-color: var(--color-surface-0)
    box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.1)
    border: 1px solid var(--color-surface-2)
    z-index: 1000
    list-style: none
    &.show
        display: block
    &.compact
        padding: 0.5em 0em
        // box-shadow: none
        .dropdown-item
            padding: 0.2em 1em

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
            background-color: var(--color-surface-3)

.dropdown-separator
    height: 1px
    margin: 0.5em 0
    background-color: var(--color-surface-1)

.dropdown-submenu
    position: relative
    >.icon
        margin: auto 0
        margin-left: auto
        width: 1em
        height: 1em
    .dropdown-items
        position: absolute
        display: block
        top: -0.5rem
        left: 100%
        padding: 0.5em 0em
        background-color: var(--color-surface-1)
        box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.1)
        z-index: 1000
        list-style: none

</style>
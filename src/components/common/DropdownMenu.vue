<template>
    <ul ref="dropdown-menu" class="dropdown-menu" @mousemove="handleMouseMove">
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
                <DropdownMenu :items="item?.items ?? []" v-show="index == hoverItemActiveIndex" />
            </li>
        </template>
    </ul>
</template>

<script lang="ts">
import { ComponentCustomProperties, defineComponent } from "vue";


export default defineComponent({
    name: "DropdownMenu",
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
            activeItemTimeout: 0,
        };
    },
    mounted() {
        this.items.forEach((item: DropdownItem) => {
            item.type = item.type || 'item';
        });

        this.lastHoveredItemIndex = -1;
        this.hoverItemActiveIndex = -1;
        this.lastHoverChange = Date.now();

    },

    methods: {
        itemClicked(item: DropdownItem) {
            console.log(this.$context);
            // item.action 
            item.action && item.action(this.$context as unknown as ComponentCustomProperties);
        },
        handleMouseMove(event: MouseEvent) {

            // If the mouse is moving, get the dropdown item that is being hovered and set it as the last hovered item
            const dropdownItems = (this.$refs['dropdown-menu'] as HTMLElement).children;
            const hoveredItemIndex = Array.from(dropdownItems).findIndex((item: Element) => item.contains(event.target as Node));
            if (hoveredItemIndex == this.lastHoveredItemIndex) return;
            this.lastHoveredItemIndex = hoveredItemIndex;
            this.lastHoverChange = Date.now();

            if (this.activeItemTimeout) clearTimeout(this.activeItemTimeout);
            // If the hovered item is unchanged for 500ms, set it as the active item
            // this.activeItemTimeout = setTimeout(() => {
            this.hoverItemActiveIndex = hoveredItemIndex;
            // }, 200);



        },
    },
});
</script>

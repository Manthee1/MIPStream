<template>
  <ul class="dropdown-menu" @mousemove="handleMouseMove">
        <template v-for="(item, index) in items" :key="item.label" >
            <li class="dropdown-item" @click="itemClicked(item)" v-if="item.type == 'item'">
                {{ item.label }}
            </li>
            <li v-else-if="item.type === 'separator'" class="dropdown-separator"></li>
            <li v-else-if="item.type === 'submenu'" class="dropdown-item dropdown-submenu">
                {{ item.label }}
                <vue-feather type="chevron-right" class="icon icon-chevron" />
                <DropdownMenu :items="item.items" v-show="index == lastHoveredItemIndex" />
            </li>
        </template>
    </ul>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { DropdownItem } from "../../types";


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
    };
  },
  mounted() {
    this.items.forEach((item: DropdownItem) => {
        item.type = item.type || 'item';
    });

    this.lastHoveredItemIndex = -1;
  },

  methods: {
    itemClicked(item: DropdownItem) {
      item.action && item.action();
    },
    handleMouseMove(event: MouseEvent) {
        console.log('mouse move');
        
    //   If the mouse is moving, get the dropdown item that is being hovered and set it as the last hovered item
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        const hoveredItemIndex = Array.from(dropdownItems).findIndex((item: Element) => item.contains(event.target as Node));
        if (hoveredItemIndex == this.lastHoveredItemIndex) return;
        this.lastHoveredItemIndex = hoveredItemIndex;
      
        
    
    },
  },
});
</script>

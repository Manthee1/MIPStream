<template>
    <div class="dv-default-tab">
        <div class="dv-default-tab-content">{{ title }}</div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
    name: "DockviewTab",
    props: {
        params: {
            required: false,
        },
    },
    data() {
        return {
            title: "",
        };
    },
    mounted() {
        this.title = this.params.api.title;
    },

});
</script>
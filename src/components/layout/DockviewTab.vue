<template>
    <div class="dv-default-tab">
        <div class="dv-default-tab-content">{{ title }}</div>
        <VueFeather v-if="params.params.tab" class="dv-default-tab-icon" type="more-vertical" :size="18" />
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
        console.log('Params', this.params.params);

    },

});
</script>

<style scoped lang="sass">
.dv-default-tab-icon
    color: var(--color-intermediate)
    margin: 10px 0px;
    cursor: pointer
    transition: color 0.2s
    padding: 0.2em
    border-radius: 50%
    &:hover
        color: var(--color-intermedium)
        background-color: var(--color-light)
        
</style>
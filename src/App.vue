<template>
    <main>
        <TopBar fileName="Test"/>
        <router-view />
    </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TopBar from '@/components/layout/TopBar.vue';

export default defineComponent({
    name: 'App',
    components: {
        TopBar
    },
});
</script>


<style lang="sass">
@use './assets/sass/main'

</style>

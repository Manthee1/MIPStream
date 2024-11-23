<template>
    <div class="sidebar">
        <Accordion label="Stages" icon="layers">
            <Stages />
        </Accordion>
        <Accordion label="Registers" icon="hard-drive">
            <Registers />
        </Accordion>
        <Accordion label="Memory" icon="database">
            <Memory />
        </Accordion>
    </div>
</template>

<script>
import Accordion from './Accordion.vue';
import Memory from './Memory.vue';
import Registers from './Registers.vue';
import Stages from './Stages.vue';
export default {
    components: { Accordion, Stages, Registers, Memory },
    name: 'SideBar',

};
</script>

<style scoped>
.sidebar {
    background-color: var(--color-background-dark);
    height: 100%;
    width: 300px;
    min-width: 300px;
    overflow: hidden;
}
</style>
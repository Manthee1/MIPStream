<template>
    <div class="sidebar">
        <Accordion open label="Stages" icon="layers">
            <Stages />
        </Accordion>
        <Accordion open label="Registers" icon="hard-drive">
            <Registers />
        </Accordion>
        <Accordion open label="Memory" icon="database">
            <Memory />
        </Accordion>
    </div>
</template>

<script>
import Accordion from '../common/Accordion.vue';
import Memory from '../features/Memory.vue';
import Registers from '../features/Registers.vue';
import Stages from '../features/Stages.vue';
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
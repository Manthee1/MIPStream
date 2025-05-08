<template>
    <div class="problems-container">
        <template
            v-if="this.$simulationStore.errors.length + this.$simulationStore.runtimeErrors.length + this.$simulationStore.warnings.length > 0">
            <ul class="warning-list">
                <li class='warning-item' v-for="error in this.$simulationStore.warnings" :key="error">
                    <vue-feather :size='16' class="icon" type="alert-triangle" />
                    <span>{{ error }}</span>
                </li>
            </ul>
            <ul class="error-list">
                <li class='error-item'
                    v-for="error in [...this.$simulationStore.runtimeErrors, ...this.$simulationStore.errors]"
                    :key="error">
                    <vue-feather :size='16' class="icon" type="alert-triangle" />
                    <span>{{ error }}</span>
                </li>
            </ul>
        </template>
        <p v-else>No errors</p>


    </div>
</template>

<script>
export default {

}
</script>

<style lang="sass" scoped>
.problems-container
    padding: 2rem
    min-height: 200px
    .error-list, .warning-list
        display: flex
        flex-flow: column nowrap
        list-style-type: none
        padding: 0
        margin: 0
        .error-item, .warning-item
            display: flex
            flex-flow: row nowrap
            color: var(--color-system-error)
            border-radius: 5px
            gap: 0.5rem
            span
                margin: 0px
                overflow: hidden
                text-overflow: ellipsis
            .icon
                margin: 0px
                margin-top: 5px
                flex: 0 0 16px
        .warning-item
            color: var(--color-system-warning)
    </style>
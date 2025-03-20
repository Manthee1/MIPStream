<template>
    <div class="problems-container">
        <template v-if="this.$simulationStore.errors.length > 0">
            <ul class="error-list">
                <li class='error-item flex flex-left' v-for="error in this.$simulationStore.errors" :key="error">
                    <vue-feather class="icon" type="alert-triangle" />
                    <span class="my-auto">{{ error }}</span>
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
    .error-list
        list-style-type: none
        padding: 0
        margin: 0
    .error-item
        background-color: var(--color-background)
        color: var(--color-system-error)
        border: 1px solid var(--color-background)
        border-radius: 5px
        overflow: hidden
        text-overflow: ellipsis
        .icon
            margin-right: 5px
            height: 16px
</style>
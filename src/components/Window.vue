<template>
    <div class="window">
        <div class="window-header">
            <img :src="icon" alt="icon" class="window-icon" v-if="icon" />
            <span class="window-title">{{ title }}</span>
        </div>
        <div class="window-content">
            <slot></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Window',
    props: {
        title: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: false
        }
    }
}
</script>

<style scoped lang="sass">
.window 
    border: 1px solid #ccc
    border-radius: 5px
    overflow: hidden

.window-header 
    display: flex
    align-items: center
    background-color: #f5f5f5
    padding: 10px
    border-bottom: 1px solid #ccc

.window-icon 
    width: 20px
    height: 20px
    margin-right: 10px

.window-title 
    font-weight: bold

.window-content 
    padding: 10px

</style>
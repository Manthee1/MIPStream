<template>
    <div class="m-select">
        <div class="select-box" @click="toggleDropdown">
            
            <span>{{ selectedOption?.label ?? placeholder ?? '' }}</span> 
            <vue-feather type="chevron-down" class="arrow" :class="{ 'open': isOpen }" />
        </div>
        <ul v-if="isOpen" class="options">
            <li v-for="option in options" :key="option" @click="selectOption(option)" :class="{ 'selected': option.value === selectedOption.value }">
                {{ option.label }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

type SelectOption = {
    label: string;
    value: string;
};

export default defineComponent({
    name: 'MSelect',
    props: {
        options: {
            type: Array as PropType<SelectOption[]>,
            required: true
        },
        placeholder: {
            type: String,
        },
        modelValue: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            isOpen: false,
            selectedOption: null as SelectOption | null,
        };
    },
    mounted() {
        this.selectedOption = this.options.find(option => option.value === this.modelValue) ?? this.options[0];
    },
    watch: {
        value(newValue) {
            this.selectedOption = newValue;
        }
    },
    methods: {
        toggleDropdown() {
            this.isOpen = !this.isOpen;
        },
        selectOption(option: SelectOption) {
            this.selectedOption = option;
            this.$emit('update:modelValue', option.value);
            this.isOpen = false;
        }
    }
});
</script>
<style scoped lang="sass">
.m-select
    position: relative
    width: 200px

    .select-box
        display: flex
        justify-content: space-between
        align-items: center
        padding: 10px
        border: 1px solid var(--color-medium)
        background: var(--color-white)
        cursor: pointer
        border-radius: 5px
        .arrow
            transition: transform 0.3s

            &.open
                transform: rotate(-180deg)

    .options
        position: absolute
        top: 100%
        left: 0
        width: 100%
        border: 1px solid var(--color-medium)
        background: white
        list-style: none
        padding: 0
        margin: 0
        z-index: 1
        box-shadow: 0px 2px 5px 2px rgba(0, 0, 0, 0.1)

        li
            padding: 1rem
            cursor: pointer

            &:hover
                background: var(--color-light)
            &.selected
                background: var(--color-medium)


</style>
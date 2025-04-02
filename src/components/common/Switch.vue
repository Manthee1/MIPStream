<template>
    <div class="switch" :class="{ 'switch--on': modelValue }" @click="toggle">
        <div class="switch__toggle"></div>
    </div>
</template>

<script>
export default {
    name: 'Switch',
    props: {
        modelValue: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        toggle(e) {
            this.$emit('update:modelValue', !this.modelValue);
        }
    }
};
</script>

<style scoped>
.switch {
    width: 50px;
    height: 25px;
    background-color: var(--color-surface-3);
    border-radius: 25px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.3s;
}

.switch--on {
    background-color: var(--color-accent);
}

.switch__toggle {
    width: 23px;
    height: 23px;
    background-color: var(--color-surface-0);
    border-radius: 50%;
    position: absolute;
    top: 1px;
    left: 1px;
    transition: left 0.3s;
}

.switch--on .switch__toggle {
    left: 26px;
}
</style>
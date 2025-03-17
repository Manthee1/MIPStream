<template>
    <div class="range-container">
        <input type="range" :value="value" @input="updateValue" step="1" min="0" max="100" :style="gradientStyle" />
        <span>{{ value }}</span>
    </div>
</template>

<script lang="ts">
export default {
    name: 'MRange',
    props: {
        modelValue: Number
    },
    data() {
        return {
            value: 50
        };
    },
    created() {
        this.value = this.modelValue;
    },
    computed: {
        gradientStyle() {
            return {
                background: `linear-gradient(to right, var(--color-accent) ${this.value}%, var(--color-light) ${this.value}%)`
            };
        }
    },
    methods: {
        updateValue(event) {
            this.value = event.target.value;
            this.$emit('update:modelValue', this.value);
        }
    }
};
</script>

<style scoped lang="scss">
.range-container {
    display: flex;
    align-items: center;
}

input[type="range"] {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 3px;
    background: var(--color-intermediate);
    outline: none;
    opacity: 0.7;
    transition: opacity .2s;
    padding: 0.2rem 0px;
    border: none;

    &:hover {
        opacity: 1;
    }

    &::-moz-range-track,
    &::-webkit-slider-runnable-track {
        // background: black;
        outline: none;
    }

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: var(--color-accent);
        cursor: pointer;
    }

    &::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: var(--color-accent);
        cursor: pointer;
        border: none;
        border-radius: 50%;
    }
}
</style>
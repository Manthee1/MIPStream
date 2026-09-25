<template>
    <div class="range-container">
        <input type="range" :value="value" @input="updateValue" :step="step" :min="min" :max="max"
            :style="gradientStyle" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'MRange',
    props: {
        modelValue: {
            type: Number,
            required: true,
        },
        min: {
            type: Number,
            default: 0,
        },
        max: {
            type: Number,
            default: 100,
        },
        step: {
            type: Number,
            default: 1,
        }
    },
    data() {
        return {
            value: 50
        };
    },
    created() {
        this.value = this.modelValue;
    },
    watch: {
        modelValue(newValue) {
            this.value = newValue;
        }
    },
    computed: {
        gradientStyle() {
            return {
                background: `linear-gradient(to right, var(--color-accent) ${(this.value - this.min) / (this.max - this.min) * 100}%, var(--color-surface-1) ${(this.value - this.min) / (this.max - this.min) * 100}%)`
            };
        }
    },
    methods: {
        updateValue(event: Event) {
            this.value = (event?.target as HTMLInputElement).valueAsNumber;
            this.$emit('update:modelValue', this.value);
        }
    }
});
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
    background: var(--color-surface-4);
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
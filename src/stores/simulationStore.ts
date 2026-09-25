import { defineStore } from "pinia";
import { SimulationState } from "../shared/types/architecture";

export const useSimulationStore = defineStore("simulation", {
    state: () => ({
        // Shared memory buffer index for UI sampling
        wireValues: new Uint32Array(0),
        cycleCount: 0,
        status: "stopped" as "running" | "stopped" | "paused",
        speed: 10,
    }),

    actions: {
        async step() {
            // Call headless engine step
            this.cycleCount++;
        },

        async run() {
            this.status = "running";
            // Simulation loop logic
        },

        pause() {
            this.status = "paused";
        },

        stop() {
            this.status = "stopped";
            this.cycleCount = 0;
        },

        reset() {
            this.stop();
            this.wireValues = new Uint32Array(0);
        }
    },
});

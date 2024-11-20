import { defineStore } from 'pinia'
import DLXCore from '../assets/js/core/DLXCore'


export const useDlxStore = defineStore('dlx', {
    state: () => ({
        DLXCore: new DLXCore(),
        program: '' as string,
    }),
    getters: {

    },
    actions: {
        loadProgram() {
            const program = this.program.split('\n').filter(line => line.trim() !== '');
            console.log(program);

            this.DLXCore.loadProgram(program);
        },
        step() {
            this.DLXCore.runCycle();
        },
        run() {
            // this.DLXCore.run();
        },

    }
})



import { defineStore } from 'pinia'
import DLXCore from '../assets/js/core/DLXCore'
import INSTRUCTION_SET from '../assets/js/config/instructionSet';


export const useDlxStore = defineStore('dlx', {
    state: () => ({
        DLXCore: new DLXCore(),
        program: '' as string,
        status: 'stopped' as | 'running' | 'stopped' | 'paused',

    }),
    getters: {

    },
    actions: {
        loadProgram() {
            this.status = 'paused';
            const program = this.program.split('\n').filter(line => line.trim() !== '');
            console.log(program);

            this.DLXCore.loadProgram(program);
        },
        step() {
            if (this.status != 'paused') return;
            this.DLXCore.runCycle();

        },
        pause() {
            this.status = 'paused';
        },
        stop() {
            this.status = 'stopped';

        },
        run() {
            this.loadProgram();
            const haltOpcode: number = INSTRUCTION_SET.findIndex(instruction => instruction.mnemonic === 'HALT');
            this.status = 'running';
            // Run until the program is finished
            while (this.status == 'running' && this.DLXCore.cpu.stages[3].IR?.opcode !== haltOpcode) {
                this.DLXCore.runCycle();
            }
            this.status = 'stopped';
        },

    }
})



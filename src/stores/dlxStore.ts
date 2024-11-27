import { defineStore } from 'pinia'
import DLXCore from '../assets/js/core/DLXCore'
import INSTRUCTION_SET from '../assets/js/config/instructionSet';
import { wait } from '../assets/js/utils';


export const useDlxStore = defineStore('dlx', {
    state: () => ({
        DLXCore: new DLXCore(),
        program: '' as string,
        status: 'stopped' as ('running' | 'stopped' | 'paused'),
        speed: 0 as number, // cycles per second
        breakpoints: [] as number[],
        PCToLineMap: [] as number[],

    }),
    getters: {

    },
    actions: {

        getStageLine(stage: number): number {
            return this.PCToLineMap[this.DLXCore.cpu.stages[stage].NPC - 3] ?? -1;
        },

        mapPCToLine() {
            const program = this.program.replace(/\r/g, '\n').split('\n');
            const PCToLineMap: number[] = [];
            for (let line = 0; line < program.length; line++) {
                if (program[line].trim() !== '')
                    PCToLineMap.push(line + 1);
            }
            this.PCToLineMap = PCToLineMap;
        },

        loadProgram() {
            this.status = 'paused';
            this.mapPCToLine();
            console.log(this.PCToLineMap);

            const program = this.program.replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');

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
            this.status = 'running';
            this.resume();
        },

        async resume() {
            const haltOpcode: number = INSTRUCTION_SET.findIndex(instruction => instruction.mnemonic === 'HALT');
            this.status = 'running';
            // Run until the program is finished
            while (this.status == 'running' && this.DLXCore.cpu.stages[4].IR?.opcode !== haltOpcode) {
                this.DLXCore.runCycle();
                console.log(this.breakpoints, this.PCToLineMap[this.DLXCore.cpu.PC]);
                if (this.breakpoints.includes(this.PCToLineMap[this.DLXCore.cpu.PC])) {
                    this.status = 'paused';
                    return;
                }
                if (this.status as string === 'paused') return;
                await wait(1000 / this.speed);

            }

            this.status = 'stopped';
        }

    }
})



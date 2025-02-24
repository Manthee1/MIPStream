import { defineStore } from 'pinia'
// import MIPSCore from '../assets/js/core/MIPSCore'
import { wait } from '../assets/js/utils'
import { notify } from "@kyvg/vue3-notification";
import { Assembler } from '../assets/js/core/Assembler';
import { Memory } from '../assets/js/interfaces/core';
import { AssemblerError } from '../assets/js/errors';
import { useSettingsStore } from './settingsStore';


export const useProgramExecutionStore = defineStore('programexec', {
    state: () => ({
        // MIPSCore: {} as MIPSCore,
        assembler: new Assembler([]),
        program: '' as string,
        status: 'stopped' as ('running' | 'stopped' | 'paused'),
        speed: 0 as number, // cycles per second
        breakpoints: [] as number[],
        PCToLineMap: [] as number[],
        errors: [] as string[],
        errorsUpdateTimeout: null as any,
    }),
    getters: {

    },
    actions: {
        mapPCToLine() {
            const program = this.program.replace(/\r/g, '\n').split('\n').map(line => line.trim());
            const PCToLineMap: number[] = [];
            for (let line = 0; line < program.length; line++) {
                if (program[line].trim() == '') continue;
                if (program[line].trim().endsWith(':')) continue;
                if (program[line].trim().startsWith(';')) continue;

                PCToLineMap.push(line + 1);
            }
            this.PCToLineMap = PCToLineMap;
            console.log(this.PCToLineMap);

        },


        updateErrors() {
            let timeOut = 500;
            if (useSettingsStore().instantProblemListUpdate) {
                timeOut = 0;
            }
            if (this.errorsUpdateTimeout) {
                clearTimeout(this.errorsUpdateTimeout);
            }
            this.errorsUpdateTimeout =
                setTimeout(() => {
                    this.errors = [];
                    try {
                        this.assembler.assemble(this.program);
                    } catch (errorList: any) {
                        // errorList = errorList as AssemblerErrorList
                        this.errors = errorList.errors.map((error: AssemblerError) => error.toString());
                    }
                }, timeOut);

        },

        loadProgram() {
            // this.status = 'paused';
            // let memory: Memory;

            // try {
            //     this.errors = [];
            //     const data = assemble(this.program);
            //     memory = data.memory;
            // } catch (errors: any) {
            //     const errorMessage = 'Error/s occurred while loading the program';
            //     this.errors = errors;
            //     notify({
            //         type: 'error',
            //         title: 'Error',
            //         text: errorMessage,
            //     });
            //     this.status = 'stopped';
            //     console.error(errors);

            //     return;
            // }

            // this.MIPSCore.loadProgram(memory.instructions, memory.data);
        },
        step() {
            // if (this.status != 'paused') return;
            // this.MIPSCore.runCycle();
            // const haltOpcode: number = INSTRUCTION_SET.findIndex(instruction => instruction.mnemonic === 'HALT');
            // if (this.MIPSCore.cpu.stages[4].IR?.opcode == haltOpcode) this.status = 'stopped'

        },
        pause() {
            // this.status = 'paused';
        },
        stop() {
            // this.status = 'stopped';
            // this.MIPSCore.reset();
        },
        run() {
            // this.loadProgram();
            // if (this.status === 'stopped') return;
            // this.resume();
        },

        async resume() {
            // const haltOpcode: number = INSTRUCTION_SET.findIndex(instruction => instruction.mnemonic === 'HALT');
            // this.status = 'running';
            // // Run until the program is finished
            // while (this.status == 'running' && this.MIPSCore.cpu.stages[4].IR?.opcode !== haltOpcode) {
            //     this.MIPSCore.runCycle();
            //     console.log(this.breakpoints, this.PCToLineMap[this.MIPSCore.cpu.PC]);
            //     if (this.breakpoints.includes(this.PCToLineMap[this.MIPSCore.cpu.PC])) {
            //         this.status = 'paused';
            //         return;
            //     }
            //     if (this.status === 'paused') return;
            //     await wait(1000 / this.speed);

            // }

            // this.status = 'stopped';
        }

    }
})



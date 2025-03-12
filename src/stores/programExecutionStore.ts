import { defineStore } from 'pinia'
// import MIPSCore from '../assets/js/core/MIPSCore'
import { wait } from '../assets/js/utils'
import { notify } from "@kyvg/vue3-notification";
import { Assembler } from '../assets/js/core/Assembler';
import { AssemblerError } from '../assets/js/errors';
import { useSettingsStore } from './settingsStore';
import MIPSBase from '../assets/js/core/MIPSBase';
import { instructionConfig } from '../assets/js/core/config/instructions';
import { useViewStore } from './viewStore';


export const useProgramExecutionStore = defineStore('programexec', {
    state: () => ({
        core: new MIPSBase(),
        assembler: new Assembler(instructionConfig),
        program: '' as string,
        status: 'stopped' as ('running' | 'stopped' | 'paused'),
        speed: 10 as number, // cycles per second
        breakpoints: [] as number[],
        PCToLineMap: [] as number[],
        stagePCs: [-1, -1, -1, -1, -1] as [number, number, number, number, number],
        errors: [] as string[],
        errorsUpdateTimeout: null as any,
    }),
    getters: {

    },
    actions: {
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
            this.status = 'paused';
            let instructionMemory: Uint32Array;

            try {
                this.errors = [];
                const data = this.assembler.assemble(this.program);
                instructionMemory = data.instructions;
                this.PCToLineMap = data.pcLineMap;
            } catch (errors: any) {
                const errorMessage = 'Error/s occurred while loading the program';
                this.errors = errors;
                notify({
                    type: 'error',
                    title: 'Error',
                    text: errorMessage,
                });
                this.status = 'stopped';
                console.error(errors);

                return;
            }
            this.stagePCs = [0, -1, -1, -1, -1];

            this.core.loadProgram(instructionMemory);
            useViewStore().cpuDiagram.draw();
        },
        step() {
            if (this.status != 'paused') return;
            // Add current pc to stagePCs and remove the oldest one
            this.core.runCycle();
            this.stagePCs.unshift(this.core.PC.value / 4);
            this.stagePCs.pop();
            useViewStore().cpuDiagram.draw();
            if (this.core.halted) this.status = 'stopped'
        },
        pause() {
            this.status = 'paused';
        },
        stop() {
            this.status = 'stopped';
            this.core.reset();
            this.stagePCs = [-1, -1, -1, -1, -1];
        },
        run() {
            this.loadProgram();
            if (this.status === 'stopped') return;
            this.resume();
        },

        async resume() {
            this.status = 'running';
            // Run until the program is finished
            while (this.status == 'running' && !this.core.halted) {
                // Add current pc to stagePCs and remove the oldest one
                this.core.runCycle();
                this.stagePCs.unshift(this.core.PC.value / 4);
                this.stagePCs.pop();
                useViewStore().cpuDiagram.draw();
                console.log(this.breakpoints, this.PCToLineMap[this.core.PC.value / 4]);
                if (this.breakpoints.includes(this.PCToLineMap[this.core.PC.value / 4])) {
                    this.status = 'paused';
                    return;
                }
                await wait(1000 / this.speed);

            }

            this.status = 'stopped';
        }

    }
})



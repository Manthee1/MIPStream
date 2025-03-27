import { defineStore } from 'pinia'
// import MIPSCore from '../assets/js/core/MIPSCore'
import { clone, wait } from '../assets/js/utils'
import { notify } from "@kyvg/vue3-notification";
import { Assembler } from '../assets/js/core/Assembler';
import { AssemblerError } from '../assets/js/errors';
import { useSettingsStore } from './settingsStore';
import MIPSBase from '../assets/js/core/MIPSBase';
import { instructionConfig } from '../assets/js/core/config/instructions';
import { useUIStore } from './UIStore';
import { CPUDiagram } from '../assets/js/core/diagram/CPUDiagram';
import { defaultProjectSettings, Project } from '../db/projectsTable';
import { useProjectStore } from './projectStore';


export const useSimulationStore = defineStore('simulation', {
    state: () => ({
        core: new MIPSBase(),
        cpuDiagram: {} as CPUDiagram,
        assembler: new Assembler(instructionConfig),
        // Program is the currently running program that had no assembly errors
        loadedProgram: '' as string,
        program: '' as string,

        status: 'stopped' as ('running' | 'stopped' | 'paused'),
        get speed() { return useProjectStore().currentProject?.settings.speed || 10 },
        set speed(value: number) { useProjectStore().setProjectSetting('speed', value) },
        breakpoints: [] as number[],
        PCToLineMap: [] as number[],
        instructionCount: 0 as number,
        stagePCs: [-1, -1, -1, -1, -1] as [number, number, number, number, number],
        errors: [] as string[],
        errorsUpdateTimeout: null as any,
    }),
    getters: {

    },
    actions: {

        init(project: Project) {
            this.core = new MIPSBase({
                dataMemorySize: project?.settings?.memorySize ?? defaultProjectSettings.memorySize,
            } as any);
            this.program = project.code;

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

        shiftStagePCs() {
            const pc = this.core.PC.value / 4;

            this.stagePCs.unshift(pc < this.instructionCount ? pc : -1);
            this.stagePCs.pop();

            if (pc > this.instructionCount + 2)
                this.core.halt();

        },

        loadProgram() {
            let instructionMemory: Uint32Array;

            if (this.program === '') {
                notify({
                    type: 'error',
                    title: 'Error',
                    text: 'No program to load',
                });
                return;
            }

            // If we have errors, don't load the program
            if (this.errors.length > 0) {
                notify({
                    type: 'error',
                    title: 'Error',
                    text: 'Please fix the errors before loading the program',
                });
                return;
            }

            try {
                this.status = 'paused';
                this.errors = [];
                const data = this.assembler.assemble(this.program);
                instructionMemory = data.instructions;
                this.PCToLineMap = data.pcLineMap;
                this.instructionCount = data.instructions.length;
            } catch (errors: any) {
                const errorMessage = 'Error/s occurred while loading the program';
                this.updateErrors();
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
            this.loadedProgram = this.program;
            this.core.loadProgram(instructionMemory);
            this.cpuDiagram.draw();
        },
        step() {
            if (this.status != 'paused') return;
            // Add current pc to stagePCs and remove the oldest one
            this.core.runCycle();
            this.shiftStagePCs();
            this.cpuDiagram.draw();
            console.log(clone(this.stagePCs));

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
                this.shiftStagePCs();
                this.cpuDiagram.draw();
                console.log(this.breakpoints, this.PCToLineMap[this.core.PC.value / 4]);
                if (this.breakpoints.includes(this.PCToLineMap[this.core.PC.value / 4])) {
                    this.status = 'paused';
                    return;
                }
                await wait(1000 / this.speed);

            }
            if (this.core.halted)
                this.status = 'stopped';
        },


        reset() {
            this.stop();
            this.program = '';
            this.loadedProgram = '';
            this.errors = [];
        }

    }
})



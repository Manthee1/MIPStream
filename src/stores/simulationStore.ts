import { defineStore } from 'pinia'
// import MIPSCore from '../assets/js/core/MIPSCore'
import { clone, wait } from '../assets/js/utils'
import { notify } from "@kyvg/vue3-notification";
import { Assembler } from '../assets/js/core/Assembler';
import { AssemblerError } from '../assets/js/errors';
import { useSettingsStore } from './settingsStore';
import MIPSBase from '../assets/js/core/MIPSBase';
import { baseInstructionConfig } from '../assets/js/core/config/instructions';
import { CPUDiagram } from '../assets/js/core/diagram/CPUDiagram';
import { defaultProjectSettings, Project } from '../services/projectsService';
import { CPUS } from '../assets/js/core/config/cpus';
import monaco, { initLSP } from '../config/monaco';
import { validate } from '../config/monaco/validationProvider';
import { getInstructions } from '../services/instructionsService';
import { useProjectStore } from './projectStore';


export const useSimulationStore = defineStore('simulation', {
    state: () => ({
        core: new MIPSBase(),
        cpuType: 'basic' as string,
        cpuDiagram: {} as CPUDiagram,
        assembler: new Assembler(baseInstructionConfig),
        // Program is the currently running program that had no assembly errors
        loadedProgram: '' as string,
        program: '' as string,

        status: 'stopped' as ('running' | 'stopped' | 'paused'),
        speed: 10 as number,
        breakpoints: [] as number[],
        PCToLineMap: [] as number[],
        instructionCount: 0 as number,
        stagePCs: [-1, -1, -1, -1, -1] as [number, number, number, number, number],
        errors: [] as string[],
        runtimeErrors: [] as string[],
        errorsUpdateTimeout: null as any,
    }),
    getters: {

    },
    actions: {

        async init(project: Project) {
            const cpuOptions = {
                dataMemorySize: project?.settings?.memorySize ?? defaultProjectSettings.memorySize,
                instructionMemorySize: project?.settings?.instructionMemorySize ?? defaultProjectSettings.instructionMemorySize,
            } as any

            // Get cpu type
            const cpuType = project?.settings?.cpuType ?? defaultProjectSettings.cpuType;
            const cpuConfig = CPUS[cpuType];

            const customInstructions = await getInstructions(999, { cpuType: cpuType });
            console.log('customInstructions', customInstructions);

            if (customInstructions) {
                cpuOptions.customInstructions = customInstructions;
            }

            try {
                if (!cpuConfig) {
                    notify({
                        type: 'error',
                        title: 'Error',
                        text: 'CPU type ${cpuType} not found. Using default CPU.',
                    });
                    this.core = new MIPSBase(cpuOptions);
                }
                else this.core = new cpuConfig.cpu(cpuOptions);

            } catch (error: any) {
                notify({
                    type: 'error',
                    title: 'Error',
                    text: 'Error loading CPU: ' + error.message,
                });
                return;
            }

            this.assembler = new Assembler(this.core.instructionConfig, {
                registerPrefix: project?.settings?.registerPrefix ?? defaultProjectSettings.registerPrefix,
            });

            this.speed = project?.settings?.speed ?? defaultProjectSettings.speed;

            this.cpuType = cpuType;

            this.program = project.code;
            initLSP(this.core.instructionConfig);

            this.updateErrors();

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

                    const monacoEditorModel = monaco.editor.getModels()[0];
                    validate(monacoEditorModel);

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
            let memory: number[] = [];
            try {
                this.status = 'paused';
                this.errors = [];
                this.runtimeErrors = [];
                const data = this.assembler.assemble(this.program);
                instructionMemory = data.instructions;
                this.PCToLineMap = data.pcLineMap;
                this.instructionCount = data.instructions.length;
                memory = data.memory;
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
            try {
                this.core.loadProgram(instructionMemory);
                this.core.loadMemory(memory);
            }
            catch (error: any) {
                notify({
                    type: 'error',
                    title: 'Error loading program',
                    text: error.message,
                });
                console.error(error);
                this.status = 'stopped';
                return;
            }
            this.cpuDiagram.draw();
        },
        step() {
            if (this.status != 'paused') return;
            // Add current pc to stagePCs and remove the oldest one
            this.runCycle();
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
                this.runCycle();
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

        runCycle() {
            try {
                this.core.runCycle();
            } catch (error: any) {
                console.error(error);
                this.status = 'stopped';
                notify({
                    type: 'error',
                    title: 'Error',
                    text: 'Runtime Error: ' + error.message,
                });
                this.runtimeErrors.push(error.message);
            }
        },

        setSpeed(speed: number) {
            this.speed = speed;
            useProjectStore().setProjectSetting('speed', speed);
        },


        reset() {
            this.stop();
            this.program = '';
            this.loadedProgram = '';
            this.errors = [];
        }

    }
})



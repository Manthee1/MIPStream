import { defineStore } from 'pinia'
// import MIPSCore from '../assets/js/core/MIPSCore'
import { clone, wait } from '../assets/js/utils'
import { notify } from "@kyvg/vue3-notification";
import { Assembler } from '../core/Assembler';
import { AssemblerError } from '../assets/js/errors';
import { useSettingsStore } from './settingsStore';
import MIPSBase from '../core/MIPSBase';
import { baseInstructionConfig } from '../core/config/instructions';
import { CPUDiagram } from '../core/diagram/CPUDiagram';
import { defaultProjectSettings, Project } from '../services/projectsService';
import { CPUS } from '../core/config/cpus';
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
        instructionMemory: new Uint32Array(0) as Uint32Array,
        dataMemory: [] as number[],
        stagePCs: [-1, -1, -1, -1, -1] as [number, number, number, number, number],
        errors: [] as string[],
        runtimeErrors: [] as string[],
        warnings: [] as string[],
        errorsUpdateTimeout: null as any,
    }),
    getters: {

    },
    actions: {

        async init(project: Project) {
            const cpuOptions = {
                dataMemorySize: project?.settings?.memorySize ?? defaultProjectSettings.memorySize,
                instructionMemorySize: 0xffff
            } as any

            // Get cpu type
            const cpuType = project?.settings?.cpuType ?? defaultProjectSettings.cpuType;
            const cpuConfig = CPUS[cpuType];

            const customInstructions = await getInstructions(999, { cpuType: cpuType });

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

        updateCode(code: string) {
            this.program = code;
            this.updateErrors();

            // If the change was done while the cpu is not stopped, add warning
            if (this.status !== 'stopped') {
                this.warnings[0] = ('Code changed while running. The editor visuals may not be in sync with the actual editor content. Please reload the program to fix this.');
                return;
            }

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
            let dataMemory: number[] = [];
            try {
                this.status = 'paused';
                this.errors = [];
                this.runtimeErrors = [];
                const data = this.assembler.assemble(this.program);
                instructionMemory = data.instructions;
                this.PCToLineMap = data.pcLineMap;
                this.instructionCount = data.instructions.length;
                dataMemory = data.memory;
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
            this.warnings = [];

            try {
                this.core.loadProgram(instructionMemory);
                this.core.loadMemory(dataMemory);
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

            notify({
                type: 'success',
                title: 'Program loaded',
                text: 'Program loaded successfully',
            });

            this.instructionMemory = instructionMemory;
            this.dataMemory = dataMemory;
            this.cpuDiagram.draw();
        },
        step() {
            if (this.status != 'paused') {
                notify({
                    type: 'warning',
                    title: 'Warning',
                    text: 'Simulation must be paused to step',
                });
                return;
            }
            // Add current pc to stagePCs and remove the oldest one
            this.runCycle();
            this.shiftStagePCs();
            this.cpuDiagram.draw();

            if (this.core.halted) this.status = 'stopped'
        },
        pause() {
            if (this.status !== 'running') {
                notify({
                    type: 'warning',
                    title: 'Warning',
                    text: 'Cannot pause simulation. Simulation is not running',
                });
                return;
            }
            this.status = 'paused';
        },
        stop() {

            if (this.status === 'stopped') {
                notify({
                    type: 'warning',
                    title: 'Warning',
                    text: 'Simulation is already stopped',
                });
                return;
            }

            this.status = 'stopped';
            this.core.reset();
            this.stagePCs = [-1, -1, -1, -1, -1];
        },
        run() {
            if (this.loadedProgram == '') {
                notify({
                    type: 'warning',
                    title: 'Warning',
                    text: 'No program loaded. Please load a program before running. You can use F6 to load the program.',
                });
                return;
            }

            if (this.status == 'running') {
                notify({
                    type: 'warning',
                    title: 'Warning',
                    text: 'Simulation is already running. You can use F8 to pause it or SHIFT + F5 to stop it.',
                });
                return;
            }


            this.stagePCs = [0, -1, -1, -1, -1];
            this.core.loadProgram(this.instructionMemory);
            this.core.loadMemory(this.dataMemory);
            console.log('Loaded program', this.instructionMemory);
            console.log('Loaded data', this.dataMemory);

            this.cpuDiagram.draw();
            this.resume();
        },

        async resume() {
            this.status = 'running';
            let lastUIUpdate = performance.now();
            const UIUpdateIntervalAtMaxSpeed = useProjectStore().getProjectSetting('UIUpdateIntervalAtMaxSpeed');
            console.log('UIUpdateIntervalAtMaxSpeed', UIUpdateIntervalAtMaxSpeed);

            // Run until the program is finished
            while (this.status == 'running' && !this.core.halted) {
                // Add current pc to stagePCs and remove the oldest one
                this.runCycle();
                this.shiftStagePCs();
                // If the speed is high draw only every 10 cycles
                if (this.speed < 100) {
                    this.cpuDiagram.draw();
                }
                if (this.breakpoints.includes(this.PCToLineMap[this.core.PC.value / 4])) {
                    this.status = 'paused';
                    return;
                }
                if (this.speed >= 100) {
                    // Request ui update every UIUpdateIntervalAtMaxSpeed ms
                    if (UIUpdateIntervalAtMaxSpeed >= 0 && performance.now() - lastUIUpdate > UIUpdateIntervalAtMaxSpeed) {
                        this.cpuDiagram.draw();
                        lastUIUpdate = performance.now();
                        await wait(0);
                        continue;
                    }
                    continue;
                }

                else await wait(1000 / this.speed);

            }
            if (this.core.halted)
                this.status = 'stopped';
            this.cpuDiagram.draw();
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
            if (this.status !== 'stopped')
                this.stop();
            this.program = '';
            this.loadedProgram = '';
            this.instructionMemory = new Uint32Array(0);
            this.dataMemory = [];
            this.errors = [];
        }

    }
})



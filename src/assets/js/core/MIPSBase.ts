import { clone } from "../utils";
import { controlSignals } from "./config/controlSignals";
import { instructionConfig } from "./config/instructions";
import { ALUControlPorts, aluPorts, controlUnitPorts, dataMemoryPorts, instructionMemoryPorts, oneToOnePorts, registerFilePorts, singleOutput, stagePorts, twoToOnePorts } from "./config/ports";

export default class MIPSBase {

    cpuOptionsConfig: CPUOptionsConfig =
        [
            {
                label: "Instruction Memory Size",
                key: "instructionMemorySize",
                default: 1024,
                type: "number",
                min: 128,
                max: 2097152,
            },
            {
                label: "Data Memory Size",
                key: "dataMemorySize",
                default: 1024,
                type: "number",
                min: 128,
                max: 2097152,
            },
        ];


    controlSignals: { [name: string]: ControlSignal } = controlSignals;
    instructionConfig: InstructionConfig[] = instructionConfig;





    public cpuLayout: CPULayout = {
        width: 1200,
        height: 700,
        components: [
            { id: "IFtoID", label: "IFtoID", type: 'register', dimensions: { width: 30, height: 500 }, pos: { x: 290, y: 150 }, ports: stagePorts.IFtoIDPorts },
            { id: "IDtoEX", label: "IDtoEX", type: 'register', dimensions: { width: 30, height: 500 }, pos: { x: 590, y: 150 }, ports: stagePorts.IDtoEXPorts },
            { id: "EXtoMEM", label: "EXtoMEM", type: 'register', dimensions: { width: 30, height: 500 }, pos: { x: 880, y: 150 }, ports: stagePorts.EXtoMEMPorts },
            { id: "MEMtoWB", label: "MEMtoWB", type: 'register', dimensions: { width: 30, height: 500 }, pos: { x: 1080, y: 150 }, ports: stagePorts.MEMtoWBPorts },
            { id: "PC", label: "PC", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 50, y: 220 }, ports: clone(oneToOnePorts) },
            { id: "InstructionMemory", label: "InstructionMemory", type: 'register', dimensions: { width: 100, height: 150 }, pos: { x: 140, y: 220 }, ports: instructionMemoryPorts },
            { id: "Const4", label: "Const4", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 200, y: 60 }, ports: [...clone(singleOutput)] },
            { id: "NextPCAdder", label: "NextPCAdder", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 290, y: 50 }, ports: clone(twoToOnePorts) },
            { id: "ControlUnit", label: "ControlUnit", type: 'register', dimensions: { width: 50, height: 100 }, pos: { x: 410, y: 90 }, ports: controlUnitPorts },
            { id: "RegisterControlUnit", label: "RegisterControlUnit", type: 'register', dimensions: { width: 120, height: 200 }, pos: { x: 400, y: 220 }, ports: registerFilePorts },
            { id: "ImmExtend", label: "ImmExtend", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 440, y: 450 }, ports: clone(oneToOnePorts) },
            { id: "ShiftLeft", label: "ShiftLeft", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 700, y: 110 }, ports: clone(oneToOnePorts) },
            { id: "BranchAdder", label: "BranchAdder", type: 'register', dimensions: { width: 25, height: 25 }, pos: { x: 770, y: 80 }, ports: clone(twoToOnePorts) },
            { id: "ALUSrcMUX", label: "ALUSrcMUX", type: 'mux', dimensions: { width: 25, height: 50 }, pos: { x: 720, y: 280 }, ports: clone(twoToOnePorts) },
            { id: "ALU", label: "ALU", type: 'register', dimensions: { width: 50, height: 100 }, pos: { x: 780, y: 220 }, ports: aluPorts },
            { id: "ALUControl", label: "ALUControl", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 780, y: 360 }, ports: ALUControlPorts },
            { id: "RegDstMUX", label: "RegDstMUX", type: 'mux', dimensions: { width: 25, height: 50 }, pos: { x: 700, y: 470 }, ports: clone(twoToOnePorts) },
            { id: "BranchAndGate", label: "BranchAndGate", type: 'register', dimensions: { width: 50, height: 50 }, pos: { x: 960, y: 80 }, ports: twoToOnePorts },
            { id: "BranchMUX", label: "BranchMUX", type: 'mux', dimensions: { width: 25, height: 50 }, pos: { x: 1040, y: 40 }, ports: clone(twoToOnePorts) },
            { id: "DataMemory", label: "DataMemory", type: 'register', dimensions: { width: 100, height: 150 }, pos: { x: 960, y: 190 }, ports: dataMemoryPorts },
            { id: "MemtoRegMUX", label: "MemtoRegMUX", type: 'mux', dimensions: { width: 25, height: 50 }, pos: { x: 1160, y: 330 }, ports: clone(twoToOnePorts) },
        ],
        connections: [],
    }




    options: { [name: string]: any } = {};

    // get options() {
    //     console.log(this._options);
    //     return this._options;
    // }

    registerFile: Uint32Array;
    instructionMemory: Uint8Array;
    dataMemory: Uint8Array;

    verifyOptions(options: Array<{ [name: string]: any }>) {

        // Covert options to array
        Object.entries(options).forEach(option => {
            let [key, value] = option;
            let config = this.cpuOptionsConfig.find(config => config.key === key);
            if (!config) {
                throw new Error(`Invalid option: ${value}`);
            }
            if (config.type !== typeof value) {
                throw new Error(`Invalid type for option: ${value}`);
            }
            if (typeof value === 'number') {
                if (!Number.isInteger(value))
                    throw new Error(`Invalid value for option: ${value}`);

                if (config.min && value < config.min)
                    throw new Error(`Invalid value for option: ${value}`);

                if (config.max && value > config.max)
                    throw new Error(`Invalid value for option: ${value}`);
            }

            if (config.verify && !config.verify(value)) {
                throw new Error(`Invalid value for option: ${value}`);
            }

        });

    }


    constructor(options?: Array<{ [name: string]: any }>) {

        if (!options) options = [];

        let defaultOptions: { [name: string]: any } = {};
        this.cpuOptionsConfig.forEach(config => {
            defaultOptions[config.key] = config.default;
        });

        options = Object.assign(defaultOptions, options);


        try {
            this.verifyOptions(options);
        } catch (error: any) {
            throw new Error(`Invalid options: ${error.message}`);
        }

        this.options = options;

        this.registerFile = new Uint32Array(32);
        this.instructionMemory = new Uint8Array(this.options.instructionMemorySize);
        this.dataMemory = new Uint8Array(this.options.dataMemorySize);






    }





}
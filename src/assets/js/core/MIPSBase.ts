import { clone } from "../utils";

type CPUOptionsConfig = Array<{
    label: string;
    key: string;
    default: any;
    type: 'number' | 'string' | 'boolean';
    min?: number;
    max?: number;
    verify?: (value: any) => boolean | never;
}>




const controlSignals = {
    RegWrite: {
        bits: 1,
        name: "RegWrite",
    },
    MemtoReg: {
        bits: 1,
        name: "MemtoReg",
    },
    MemWrite: {
        bits: 1,
        name: "MemWrite",
    },
    MemRead: {
        bits: 1,
        name: "MemRead",
    },
    Branch: {
        bits: 1,
        name: "Branch",
    },
    ALUOp: {
        bits: 2,
        name: "ALUOp",
    },
    ALUSrc: {
        bits: 1,
        name: "ALUSrc",
    },
    RegDst: {
        bits: 1,
        name: "RegDst",
    },
};


const singleInput: Array<PortLayout> = [
    {
        id: "in",
        label: "in",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
]

const singleOutput: Array<PortLayout> = [
    {
        id: "out",
        label: "out",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
]


const doubleInput: Array<PortLayout> = [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
]

const oneToOnePorts: Array<PortLayout> = [
    ...clone(singleInput),
    ...clone(singleOutput),
]

const twoToOnePorts: Array<PortLayout> = [
    ...clone(doubleInput),
    ...clone(singleOutput),
]


const instructionMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "instruction",
        label: "instruction",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
]

const controlUnitPorts: Array<PortLayout> = [
    {
        id: "opcode",
        label: "opcode",
        type: 'input',
        location: 'left',
        bits: 6,
        value: 0,
        relPos: 0.5,
    },
]


const registerFilePorts: Array<PortLayout> = [
    {
        id: "read1",
        label: "read1",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "read2",
        label: "read2",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.8,
    },
    {
        id: "write",
        label: "write",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "data",
        label: "data",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "read1Data",
        label: "read1Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "read2Data",
        label: "read2Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
];


const aluPorts: Array<PortLayout> = [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
    {
        id: "ALUOut",
        label: "ALUOut",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "zero",
        label: "Zero",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.45,
    },
];


const ALUControlPorts: Array<PortLayout> = [
    {
        id: "ALUOp",
        label: "ALUOp",
        type: 'input',
        location: 'right',
        bits: 2,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "funct",
        label: "funct",
        type: 'input',
        location: 'left',
        bits: 6,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        type: 'output',
        location: 'top',
        bits: 4,
        value: 0,
        relPos: 0.5,
    },
];

const dataMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.1,
    },
    {
        id: "writeData",
        label: "writeData",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.4,
    },
    {
        id: "readData",
        label: "readData",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
];

const stagePorts: { [key: string]: Array<PortLayout> } = {
    IFtoIDPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },

    ],
    IDtoEXPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
    ],
    EXtoMEMPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
    ],
    MEMtoWBPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
    ],
}


Object.values(stagePorts).forEach(ports => {
    console.log(ports);

    const mirroredPorts = []
    for (let port of ports) {
        const mirroredPort = clone(port);

        port.id = `${port.id}In`;
        port.location = 'left';
        port.type = 'input';

        mirroredPort.location = 'right';
        mirroredPort.id = `${port.id}Out`;
        mirroredPort.type = 'output';
        mirroredPorts.push(mirroredPort);
    }
    ports.push(...mirroredPorts);
});


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




    instructionConfig: InstructionConfig[] = [
        {
            opcode: 0x00,
            mnemonic: "add",
            type: 'R',
            controlSignals: {
                RegDst: 1,
                RegWrite: 1,
                ALUOp: 2,
            },
            funct: 0x20,
        },
        {
            opcode: 0x08,
            mnemonic: "addi",
            type: 'I',
            controlSignals: {
                ALUSrc: 1,
                RegWrite: 1,
                ALUOp: 0,
            },
        },
        {
            opcode: 0x23,
            mnemonic: "lw",
            type: 'I',
            controlSignals: {
                ALUSrc: 1,
                MemtoReg: 1,
                MemRead: 1,
                RegWrite: 1,
                ALUOp: 0,
            },
        },
        {
            opcode: 0x2b,
            mnemonic: "sw",
            type: 'I',
            controlSignals: {
                ALUSrc: 1,
                MemWrite: 1,
                ALUOp: 0,
            },
        },
        {
            opcode: 0x04,
            mnemonic: "beq",
            type: 'I',
            controlSignals: {
                ALUOp: 1,
                Branch: 1,
            },
        },
    ];





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

        const controlSignalsAmount = Object.keys(controlSignals).length;
        for (let controlSignalIndex in Object.values(controlSignals)) {
            const controlSignal = Object.values(controlSignals)[controlSignalIndex];
            controlUnitPorts.push({
                id: controlSignal.name,
                label: controlSignal.name,
                type: 'output',
                location: 'right',
                bits: controlSignal.bits,
                value: 0,
                relPos: (parseInt(controlSignalIndex) + 1) / (controlSignalsAmount + 1),
            });
        }




    }





}
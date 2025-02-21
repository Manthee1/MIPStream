type CPUOptionsConfig = Array<{
    label: string;
    value: string;
    default: any;
    type: 'number' | 'string' | 'boolean';
    min?: number;
    max?: number;
    verify?: (value: any) => boolean | never;
}>


interface ComponentLayout {
    id: string;
    dimensions: Dimensions;
    pos: Position;
    ports?: Array<PortLayout>;
}

interface CPULayout {
    width: number;
    height: number;
    components: Array<ComponentLayout>;
}



class BaseCPU {

    cpuOptionsConfig: CPUOptionsConfig =
        [
            {
                label: "Instruction Memory Size",
                value: "instructionMemorySize",
                default: 1024,
                type: "number",
                min: 128,
                max: 2097152,
            },
            {
                label: "Data Memory Size",
                value: "dataMemorySize",
                default: 1024,
                type: "number",
                min: 128,
                max: 2097152,
            },
        ];



    controlSignals = {
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

    options: { [name: string]: any } = {};

    // get options() {
    //     console.log(this._options);
    //     return this._options;
    // }

    registerFile: Uint32Array;
    instructionMemory: Uint8Array;
    dataMemory: Uint8Array;

    verifyOptions(options: Array<{ [name: string]: any }>) {

        options.forEach(option => {
            let config = this.cpuOptionsConfig.find(config => config.value === option.value);
            if (!config) {
                throw new Error(`Invalid option: ${option.value}`);
            }
            if (config.type !== typeof option.default) {
                throw new Error(`Invalid type for option: ${option.value}`);
            }
            if (config.min && option.default < config.min) {
                throw new Error(`Invalid value for option: ${option.value}`);
            }
            if (config.max && option.default > config.max) {
                throw new Error(`Invalid value for option: ${option.value}`);
            }
            try {
                if (config.verify && !config.verify(option.default)) {
                    throw new Error(`Invalid value for option: ${option.value}`);
                }
            } catch (error) {
                throw new Error(`Invalid value for option: ${option.value}`);
            }

        });

    }


    constructor(options: Array<{ [name: string]: any }>) {

        let defaultOptions: { [name: string]: any } = {};
        this.cpuOptionsConfig.forEach(config => {
            defaultOptions[config.value] = config.default;
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
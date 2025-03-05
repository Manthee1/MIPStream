/** @format */

import { clone } from "../utils";
import { connections } from "./config/connections";
import { controlSignals } from "./config/controlSignals";
import { instructionConfig } from "./config/instructions";
import { ALUControlPorts, aluPorts, controlUnitPorts, dataMemoryPorts, instructionMemoryPorts, muxesPorts, muxPorts, oneToOnePorts, registerFilePorts, singleOutput, stagePorts, twoToOnePorts } from "./config/ports";

const ALUOperations = {
    ADD: 0b0000,
    SUB: 0b0001,
    AND: 0b0010,
    OR: 0b0011,
    XOR: 0b0100,
    SLL: 0b0101,
    SRL: 0b0110,
    SRA: 0b0111,
    SLT: 0b1000,
    SLTU: 0b1001,
    MUL: 0b1010,
    DIV: 0b1011,
    MFHI: 0b1100,
    MFLO: 0b1101
};


export default class MIPSBase {
    cpuOptionsConfig: CPUOptionsConfig = [
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
            { id: "IFtoID", label: "IFtoID", type: "register", dimensions: { width: 30, height: 500 }, pos: { x: 290, y: 150 }, ports: stagePorts.IFtoIDPorts },
            { id: "IDtoEX", label: "IDtoEX", type: "register", dimensions: { width: 30, height: 500 }, pos: { x: 590, y: 150 }, ports: stagePorts.IDtoEXPorts },
            { id: "EXtoMEM", label: "EXtoMEM", type: "register", dimensions: { width: 30, height: 500 }, pos: { x: 880, y: 150 }, ports: stagePorts.EXtoMEMPorts },
            { id: "MEMtoWB", label: "MEMtoWB", type: "register", dimensions: { width: 30, height: 500 }, pos: { x: 1080, y: 150 }, ports: stagePorts.MEMtoWBPorts },
            { id: "PC", label: "PC", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 47, y: 346 }, ports: clone(oneToOnePorts) },
            { id: "InstructionMemory", label: "InstructionMemory", type: "register", dimensions: { width: 100, height: 150 }, pos: { x: 147, y: 341 }, ports: instructionMemoryPorts },
            { id: "Const4", label: "Const4", type: "register", dimensions: { width: 30, height: 30 }, pos: { x: 129, y: 200 }, ports: [...clone(singleOutput)] },
            { id: "NextPCAdder", label: "NextPCAdder", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 193, y: 175 }, ports: clone(twoToOnePorts) },
            { id: "ControlUnit", label: "ControlUnit", type: "register", dimensions: { width: 50, height: 100 }, pos: { x: 411, y: 149 }, ports: controlUnitPorts },
            { id: "RegisterControlUnit", label: "RegisterControlUnit", type: "register", dimensions: { width: 120, height: 200 }, pos: { x: 428, y: 289 }, ports: registerFilePorts },
            { id: "ImmExtend", label: "ImmExtend", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 501, y: 525 }, ports: clone(oneToOnePorts) },
            { id: "ShiftLeft", label: "ShiftLeft", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 672, y: 268 }, ports: clone(oneToOnePorts) },
            { id: "BranchAdder", label: "BranchAdder", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 773, y: 253 }, ports: clone(twoToOnePorts) },
            { id: "ALUSrcMUX", label: "ALUSrcMUX", type: "mux", dimensions: { width: 25, height: 50 }, pos: { x: 726, y: 399 }, ports: muxesPorts["ALUSrcMUX"] },
            { id: "ALU", label: "ALU", type: "register", dimensions: { width: 50, height: 100 }, pos: { x: 779, y: 344 }, ports: aluPorts },
            { id: "ALUControl", label: "ALUControl", type: "register", dimensions: { width: 50, height: 50 }, pos: { x: 779, y: 481 }, ports: ALUControlPorts },
            { id: "RegDstMUX", label: "RegDstMUX", type: "mux", dimensions: { width: 25, height: 50 }, pos: { x: 702, y: 589 }, ports: muxesPorts["RegDstMUX"] },
            { id: "BranchAndGate", label: "BranchAndGate", type: "register", dimensions: { width: 25, height: 25 }, pos: { x: 947, y: 304 }, ports: twoToOnePorts },
            { id: "BranchMUX", label: "BranchMUX", type: "mux", dimensions: { width: 25, height: 50 }, pos: { x: 960, y: 210 }, ports: muxesPorts["BranchMUX"] },
            { id: "DataMemory", label: "DataMemory", type: "register", dimensions: { width: 100, height: 150 }, pos: { x: 951, y: 368 }, ports: dataMemoryPorts },
            { id: "MemtoRegMUX", label: "MemtoRegMUX", type: "mux", dimensions: { width: 25, height: 50 }, pos: { x: 1146, y: 508 }, ports: muxesPorts["MemtoRegMUX"] },

        ],
        connections: connections,
    };

    options: { [name: string]: any } = {};

    // get options() {
    //     console.log(this._options);
    //     return this._options;
    // }

    registerFile: number[];
    instructionMemory: Uint32Array;
    dataMemory: Uint8Array;

    verifyOptions(options: Array<{ [name: string]: any }>) {
        // Covert options to array
        Object.entries(options).forEach((option) => {
            let [key, value] = option;
            let config = this.cpuOptionsConfig.find((config) => config.key === key);
            if (!config) {
                throw new Error(`Invalid option: ${value}`);
            }
            if (config.type !== typeof value) {
                throw new Error(`Invalid type for option: ${value}`);
            }
            if (typeof value === "number") {
                if (!Number.isInteger(value)) throw new Error(`Invalid value for option: ${value}`);

                if (config.min && value < config.min) throw new Error(`Invalid value for option: ${value}`);

                if (config.max && value > config.max) throw new Error(`Invalid value for option: ${value}`);
            }

            if (config.verify && !config.verify(value)) {
                throw new Error(`Invalid value for option: ${value}`);
            }
        });
    }

    constructor(options?: Array<{ [name: string]: any }>) {
        if (!options) options = [];

        let defaultOptions: { [name: string]: any } = {};
        this.cpuOptionsConfig.forEach((config) => {
            defaultOptions[config.key] = config.default;
        });

        options = Object.assign(defaultOptions, options);

        try {
            this.verifyOptions(options);
        } catch (error: any) {
            throw new Error(`Invalid options: ${error.message}`);
        }

        this.options = options;

        this.reset();

    }

    PC: number = 0;
    HI: number = 0;
    LO: number = 0;
    halted: boolean = false;
    stages = {
        IFtoID: {
            IR: 0,
            NPC: 0,
        },
        IDtoEX: {
            IR: 0,
            // Control Signals
            RegWrite: 0,
            MemtoReg: 0,
            MemWrite: 0,
            MemRead: 0,
            Branch: 0,
            ALUOp: 0,
            ALUSrc: 0,
            RegDst: 0,

            NPC: 0,

            // Data
            Reg1Data: 0,
            Reg2Data: 0,
            Imm: 0,
            Rd: 0,
            Rt: 0,


        },
        EXtoMEM: {
            IR: 0,
            // Control Signals
            RegWrite: 0,
            MemtoReg: 0,
            MemWrite: 0,
            MemRead: 0,
            Branch: 0,

            TargetPC: 0,
            Zero: 0,
            ALUResult: 0,
            Reg2Data: 0,
            WriteRegister: 0,
        },
        MEMtoWB: {
            IR: 0,
            // Control Signals
            RegWrite: 0,
            MemtoReg: 0,

            ALUResult: 0,
            MemData: 0,
            WriteRegister: 0,

        },

    }

    resetStages() {
        this.stages = {
            IFtoID: {
                IR: 0,
                NPC: 0,
            },
            IDtoEX: {
                IR: 0,
                // Control Signals
                RegWrite: 0,
                MemtoReg: 0,
                MemWrite: 0,
                MemRead: 0,
                Branch: 0,
                ALUOp: 0,
                ALUSrc: 0,
                RegDst: 0,

                NPC: 0,

                // Data
                Reg1Data: 0,
                Reg2Data: 0,
                Imm: 0,
                Rd: 0,
                Rt: 0,


            },
            EXtoMEM: {
                IR: 0,
                // Control Signals
                RegWrite: 0,
                MemtoReg: 0,
                MemWrite: 0,
                MemRead: 0,
                Branch: 0,

                TargetPC: 0,
                Zero: 0,
                ALUResult: 0,
                Reg2Data: 0,
                WriteRegister: 0,
            },
            MEMtoWB: {
                IR: 0,
                // Control Signals
                RegWrite: 0,
                MemtoReg: 0,

                ALUResult: 0,
                MemData: 0,
                WriteRegister: 0,

            },
        }
    }

    loadProgram(instructions: Uint32Array) {
        if (instructions.length > this.options.instructionMemorySize) {
            throw new Error(`Program size exceeds instruction memory size`);
        }
        this.reset();
        this.instructionMemory.set(instructions);
    }




    reset() {
        this.registerFile = new Array(32).fill(0);
        this.instructionMemory = new Uint32Array(this.options.instructionMemorySize);
        this.dataMemory = new Uint8Array(this.options.dataMemorySize);
        this.PC = 0;
        this.HI = 0;
        this.LO = 0;
        this.halted = false;

        // Reset all stage data
        this.resetStages()
        window.cpu = this;

    }


    runCycle() {
        if (this.halted) return;

        // Writeback
        this.writeback();
        // Memory
        this.memory();
        // Execute
        this.execute();
        // Decode
        this.decode();
        // Fetch
        this.fetch();
    }

    fetch() {
        // Fetch instruction from memory
        const instruction = this.instructionMemory[this.stages.IFtoID.NPC / 4]; // divide by 4 because we are using a 32 bit array rather then an 8 bit array
        this.stages.IFtoID.IR = instruction;

        // Increment PC
        const NPC = this.PC + 4;
        this.stages.IFtoID.NPC = NPC;

        // Update PC
        this.PC = (this.stages.EXtoMEM.Branch && this.stages.EXtoMEM.Zero) ? this.stages.EXtoMEM.TargetPC : NPC;
    }

    decode() {
        const currStage = this.stages.IFtoID;
        const instruction = currStage.IR;
        const opcode = instruction >>> 26;
        const rs = (instruction >> 21) & 0x1F;
        const rt = (instruction >> 16) & 0x1F;
        const rd = (instruction >> 11) & 0x1F;
        const imm = instruction & 0xFFFF;


        // Forward NPC
        this.stages.IDtoEX.NPC = currStage.NPC;

        // Forward IR
        this.stages.IDtoEX.IR = currStage.IR;

        // Control Signals
        const instructionConfig = this.instructionConfig.find((config) => (config.opcode & 0b111111) === opcode);
        if (!instructionConfig) {
            throw new Error(`Invalid instruction: ${instruction}`);
        }
        console.log('is', instructionConfig);

        const controlSignals = instructionConfig.controlSignals;


        this.stages.IDtoEX.RegWrite = controlSignals.RegWrite ?? 0;
        this.stages.IDtoEX.MemtoReg = controlSignals.MemtoReg ?? 0;
        this.stages.IDtoEX.MemWrite = controlSignals.MemWrite ?? 0;
        this.stages.IDtoEX.MemRead = controlSignals.MemRead ?? 0;
        this.stages.IDtoEX.Branch = controlSignals.Branch ?? 0;
        this.stages.IDtoEX.ALUOp = controlSignals.ALUOp ?? 0;
        this.stages.IDtoEX.ALUSrc = controlSignals.ALUSrc ?? 0;
        this.stages.IDtoEX.RegDst = controlSignals.RegDst ?? 0;




        // Register File
        this.stages.IDtoEX.Reg1Data = this.registerFile[rs];
        this.stages.IDtoEX.Reg2Data = this.registerFile[rt];

        // Forward Immediate(sign extended), Rd, Rt
        this.stages.IDtoEX.Imm = imm;
        this.stages.IDtoEX.Rd = rd;
        this.stages.IDtoEX.Rt = rt;

    }

    execute() {

        let currStage = this.stages.IDtoEX;

        // Forward IR

        this.stages.EXtoMEM.IR = currStage.IR;

        // Control Signals
        this.stages.EXtoMEM.RegWrite = currStage.RegWrite;
        this.stages.EXtoMEM.MemtoReg = currStage.MemtoReg;
        this.stages.EXtoMEM.MemWrite = currStage.MemWrite;
        this.stages.EXtoMEM.MemRead = currStage.MemRead;
        this.stages.EXtoMEM.Branch = currStage.Branch;

        // Calculate TargetPC
        this.stages.EXtoMEM.TargetPC = currStage.NPC + (currStage.Imm << 2);

        // ALU Control
        const ALUOp = currStage.ALUOp & 0b11;
        const func = currStage.Imm & 0b001111;

        let ALUControl: number = 0;
        switch (ALUOp) {
            case 0b00:
                ALUControl = ALUOperations.ADD;
                break;
            case 0b01:
                ALUControl = ALUOperations.SUB;
                break;
            case 0b10:
                // Map the funct field to the ALU operation
                ALUControl = func;
                break;
            default:
                throw new Error("Unknown ALU operation");
        }

        // ALU
        const ALUSrc = currStage.ALUSrc;
        const Reg1Data = currStage.Reg1Data;
        const Reg2Data = ALUSrc ? currStage.Imm : currStage.Reg2Data;

        let ALUResult = 0;
        let HI = this.HI;
        let LO = this.LO;


        switch (ALUControl) {
            case ALUOperations.ADD: ALUResult = Reg1Data + Reg2Data; break;
            case ALUOperations.SUB: ALUResult = Reg1Data - Reg2Data; break;
            case ALUOperations.AND: ALUResult = Reg1Data & Reg2Data; break;
            case ALUOperations.OR: ALUResult = Reg1Data | Reg2Data; break;
            case ALUOperations.XOR: ALUResult = Reg1Data ^ Reg2Data; break;
            case ALUOperations.SLL: ALUResult = Reg1Data << Reg2Data; break;
            case ALUOperations.SRL: ALUResult = Reg1Data >>> Reg2Data; break;
            case ALUOperations.SRA: ALUResult = Reg1Data >> Reg2Data; break;
            case ALUOperations.SLT: ALUResult = Reg1Data < Reg2Data ? 1 : 0; break;
            case ALUOperations.SLTU: ALUResult = (Reg1Data >>> 0) < (Reg2Data >>> 0) ? 1 : 0; break;
            case ALUOperations.MUL:
                const result = BigInt(Reg1Data) * BigInt(Reg2Data);
                HI = Number(result >> 32n); // High 32 bits
                LO = Number(result & 0xFFFFFFFFn); // Low 32 bits
                ALUResult = LO; // For simplicity, returning the low part
                break;
            case ALUOperations.DIV:
                if (Reg2Data !== 0) {
                    LO = Math.floor(Reg1Data / Reg2Data);
                    HI = Reg1Data % Reg2Data;
                    ALUResult = LO; // For simplicity, returning the low part
                } else throw new Error("Division by zero");
                break;
            case ALUOperations.MFHI: ALUResult = HI; break;
            case ALUOperations.MFLO: ALUResult = LO; break;
            default: throw new Error("Unknown ALU operation");
        }

        // Forward ALUResult
        this.stages.EXtoMEM.ALUResult = ALUResult;
        this.stages.EXtoMEM.Zero = ALUResult === 0 ? 1 : 0;

        // Forward Reg2Data
        this.stages.EXtoMEM.Reg2Data = Reg2Data;

        // Forward WriteRegister
        this.stages.EXtoMEM.WriteRegister = currStage.RegDst ? currStage.Rd : currStage.Rt;
    }


    memory() {
        let currStage = this.stages.EXtoMEM;

        // Check for halt instruction
        const instruction = currStage.IR;
        const opcode = (instruction & 0xFC000000) >>> 26;
        if (opcode === 0b111111) {
            this.halt();
            return;
        }

        // Forward IR
        this.stages.MEMtoWB.IR = currStage.IR;

        // Forward ALUResult
        this.stages.MEMtoWB.ALUResult = currStage.ALUResult;

        // Forward WriteRegister
        this.stages.MEMtoWB.WriteRegister = currStage.WriteRegister;

        // Control Signals
        this.stages.MEMtoWB.RegWrite = currStage.RegWrite;
        this.stages.MEMtoWB.MemtoReg = currStage.MemtoReg;

        // Memory
        if (currStage.MemRead) {
            const address = currStage.ALUResult;
            this.stages.MEMtoWB.MemData = this.dataMemory[address];
        } else if (currStage.MemWrite) {
            const address = currStage.ALUResult;
            this.dataMemory[address] = currStage.Reg2Data;
        }
    }

    writeback() {
        let currStage = this.stages.MEMtoWB;

        // Writeback
        if (currStage.RegWrite) {
            const value = currStage.MemtoReg ? currStage.MemData : currStage.ALUResult;
            this.registerFile[currStage.WriteRegister] = value;
            console.log(this.registerFile);

            console.log(`Writeback: ${currStage.WriteRegister} = ${value}`);

        }
    }


    halt() {
        this.halted = true;
    }

}

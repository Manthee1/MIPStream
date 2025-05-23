/** @format */

import { clone, decToHex, toSigned } from "../assets/js/utils";
import { connections } from "./config/connections/base-connections";
import { baseControlSignals } from "./config/controlSignals";
import { baseInstructionConfig } from "./config/instructions";
import { stageRegisters } from "./config/stages-registers";
import { default as _ } from "./config/cpu-variables";
import { getAluControl, getAluResult } from "./config/alu";
import { components } from "./config/components";


export default class MIPSBase {
    cpuOptionsConfig: CPUOptionsConfig = [
        {
            label: "Instruction Memory Size",
            key: "instructionMemorySize",
            default: 1024,
            type: "number",
            min: 128,
            max: 0xffff,
        },
        {
            label: "Data Memory Size",
            key: "dataMemorySize",
            default: 1024,
            type: "number",
            min: 128,
            max: 2097152,
        },
        {
            label: "Custom Instructions",
            key: "customInstructions",
            default: [],
            type: "array",
        }
    ];

    controlSignals: { [name: string]: ControlSignal } = baseControlSignals;
    instructionConfig: InstructionConfig[] = baseInstructionConfig;

    public cpuLayout: CPULayout = {
        width: 1200,
        height: 700,
        components: components,
        connections: connections,
    };

    options: { [name: string]: any } = {};
    registerFile: number[];
    instructionMemory: Uint32Array;
    dataMemory: number[];

    verifyOptions(options: Record<string, any>) {
        // Covert options to array
        Object.entries(options).forEach((option) => {
            let [key, value] = option;
            let config = this.cpuOptionsConfig.find((config) => config.key === key);
            if (!config) {
                throw new Error(`Invalid option: ${value}`);
            }
            if ((config.type === "array") ? (!Array.isArray(value)) : (config.type !== typeof value)) {
                throw new Error(`Invalid type for option: ${value}`);
            }
            if (typeof value === "number") {
                if (!Number.isInteger(value)) throw new Error(`${config.key} must be an integer: ${value}`);

                if (config.min && value < config.min) throw new Error(`${config.key} must be greater than ${config.min}: ${value}`);

                if (config.max && value > config.max) throw new Error(`${config.key} must be less than ${config.max}: ${value}`);
            }

            if (config.verify && !config.verify(value)) {
                throw new Error(`Invalid value for option: ${value}`);
            }
        });
    }

    constructor(options?: Record<string, any>) {
        if (!options) options = [];

        let defaultOptions: Record<string, any> = {};
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
        this.registerFile = [];
        this.instructionMemory = new Uint32Array(this.options.instructionMemorySize);
        this.dataMemory = [];
        if (options.customInstructions.length) {
            this.instructionConfig = [...baseInstructionConfig, ...(options.customInstructions ?? [])];
        }
        this.reset();

    }

    PC = _.PC;
    HI: number = 0;
    LO: number = 0;
    halted: boolean = false;
    stageRegisters = stageRegisters;

    resetStages() {
        for (let stage of Object.values(this.stageRegisters)) {
            for (let register of Object.values(stage)) {
                register.value = 0;
            }
        }
    }

    loadProgram(instructions: Uint32Array) {
        if (instructions.length > this.options.instructionMemorySize) {
            throw new Error(`Program size (${instructions.length}) exceeds instruction memory size (${this.options.instructionMemorySize})`);
        }
        this.reset();
        this.instructionMemory.set(instructions);
        _.IR_IF.value = this.instructionMemory[0]; // divide by 4 because we are using a 32 bit array rather then an 8 bit array

    }

    loadMemory(data: number[]) {
        if (data.length > this.options.dataMemorySize) {
            throw new Error(`Data size (${data.length}) exceeds data memory size (${this.options.dataMemorySize})`);
        }
        this.dataMemory = new Array(this.options.dataMemorySize).fill(0);
        for (let i = 0; i < data.length; i++) {
            this.dataMemory[i] = data[i];
        }
    }




    reset() {
        this.registerFile = new Array(32).fill(0);
        this.instructionMemory = new Uint32Array(this.options.instructionMemorySize);
        this.dataMemory = new Array(this.options.dataMemorySize).fill(0);
        this.PC.value = 0;
        this.HI = 0;
        this.LO = 0;
        this.halted = false;
        // Reset all stage data
        this.resetStages()
        Object.values(_).forEach((variable) => {
            variable.value = 0;
        });

        _.NPC_MEM.value = 4;
        _.NPC_IF.value = 4;




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

        // Update PC
        this.PC.value = _.NPC_MEM.value;

        // Fetch instruction from memory
        _.IR_IF.value = this.instructionMemory[this.PC.value / 4]; // divide by 4 because we are using a 32 bit array rather then an 8 bit array

        // Increment PC
        this.stageRegisters.IFtoID.NPC.value = _.NPC_IF.value = this.PC.value + 4;
        _.NPC_MEM.value = _.BranchCond_MEM.value ? _.TargetPC_MEM.value : _.NPC_IF.value;




    }

    decode() {
        const currStage = this.stageRegisters.IFtoID;
        const instruction = currStage.IR.value;
        const opcode = _.OPCODE_ID.value = instruction >>> 26;
        const rs = _.Rs_ID.value = (instruction >> 21) & 0x1F;
        const rt = _.Rt_ID.value = (instruction >> 16) & 0x1F;
        const rd = _.Rd_ID.value = (instruction >> 11) & 0x1F;
        _.Imm_ID.value = instruction & 0xFFFF;
        const imm = _.SignedImm_ID.value = instruction << 16 >> 16 // sign extend


        // Forward NPC
        this.stageRegisters.IDtoEX.NPC.value = currStage.NPC.value;

        // Forward IR
        this.stageRegisters.IDtoEX.IR.value = currStage.IR.value;

        // Control Signals
        const instructionConfig = this.instructionConfig.find((config) => (config.opcode & 0b111111) === opcode);
        if (!instructionConfig) {
            throw new Error(`Invalid instruction: ${instruction}`);
        }

        const controlSignals = instructionConfig.controlSignals;


        this.stageRegisters.IDtoEX.RegWrite.value = controlSignals.RegWrite ?? 0;
        this.stageRegisters.IDtoEX.MemtoReg.value = controlSignals.MemtoReg ?? 0;
        this.stageRegisters.IDtoEX.MemWrite.value = controlSignals.MemWrite ?? 0;
        this.stageRegisters.IDtoEX.MemRead.value = controlSignals.MemRead ?? 0;
        this.stageRegisters.IDtoEX.Branch.value = controlSignals.Branch ?? 0;
        this.stageRegisters.IDtoEX.ALUOp.value = controlSignals.ALUOp ?? 0;
        this.stageRegisters.IDtoEX.ALUSrc.value = controlSignals.ALUSrc ?? 0;
        this.stageRegisters.IDtoEX.RegDst.value = controlSignals.RegDst ?? 0;


        // Register File
        this.stageRegisters.IDtoEX.Reg1Data.value = toSigned(this.registerFile[rs], 32);
        this.stageRegisters.IDtoEX.Reg2Data.value = toSigned(this.registerFile[rt], 32);

        // Forward Immediate(sign extended), Rd, Rt
        this.stageRegisters.IDtoEX.Imm.value = imm;
        this.stageRegisters.IDtoEX.Rd.value = rd;
        this.stageRegisters.IDtoEX.Rt.value = rt;

    }

    execute() {

        let currStage = this.stageRegisters.IDtoEX;

        // Forward IR
        this.stageRegisters.EXtoMEM.IR.value = currStage.IR.value;
        _.NPC_EX.value = currStage.NPC.value;

        _.Rt_EX.value = currStage.Rt.value;
        _.Rd_EX.value = currStage.Rd.value;

        // Control Signals
        this.stageRegisters.EXtoMEM.RegWrite.value = currStage.RegWrite.value;
        this.stageRegisters.EXtoMEM.MemtoReg.value = currStage.MemtoReg.value;
        this.stageRegisters.EXtoMEM.MemWrite.value = currStage.MemWrite.value;
        this.stageRegisters.EXtoMEM.MemRead.value = currStage.MemRead.value;
        this.stageRegisters.EXtoMEM.Branch.value = currStage.Branch.value;
        _.ALUSrc_EX.value = currStage.ALUSrc.value;

        // Calculate TargetPC
        _.SignedImm_EX.value = currStage.Imm.value;
        _.ShiftedImm_EX.value = currStage.Imm.value << 2;
        this.stageRegisters.EXtoMEM.TargetPC.value = currStage.NPC.value + _.ShiftedImm_EX.value;


        // ALU Control
        const ALUOp = _.ALUOp_EX.value = currStage.ALUOp.value & 0b11;
        const func = _.funct_EX.value = currStage.Imm.value & 0b111111;

        const ALUControl: number = getAluControl(ALUOp, func);
        _.ALUCONTROL_EX.value = ALUControl;

        // ALU
        const ALUSrc = _.ALUSrc_EX.value = currStage.ALUSrc.value;
        const ALUInput1 = _.ALUIn1_EX.value = _.Reg1Data_EX.value = currStage.Reg1Data.value;
        const ALUInput2 = _.ALUIn2_EX.value = ALUSrc ? currStage.Imm.value : currStage.Reg2Data.value;

        let { ALUResult, HI, LO } = getAluResult(ALUControl, ALUInput1, ALUInput2, this.HI, this.LO);
        this.HI = HI;
        this.LO = LO;

        // Forward ALUResult
        this.stageRegisters.EXtoMEM.ALUResult.value = ALUResult;
        this.stageRegisters.EXtoMEM.Zero.value = _.Zero_EX.value = ALUResult === 0 ? 1 : 0;

        // Forward Reg2Data
        this.stageRegisters.EXtoMEM.Reg2Data.value = currStage.Reg2Data.value;

        // Forward WriteRegister
        this.stageRegisters.EXtoMEM.WriteRegister.value = currStage.RegDst.value ? currStage.Rd.value : currStage.Rt.value;
    }


    memory() {
        let currStage = this.stageRegisters.EXtoMEM;

        // Check for halt instruction
        const instruction = currStage.IR.value;
        const opcode = (instruction & 0xFC000000) >>> 26;
        if (opcode === 0b111111) {
            this.halt();
            return;
        }

        _.TargetPC_MEM.value = currStage.TargetPC.value;
        _.Branch_MEM.value = currStage.Branch.value;
        _.MemWrite_MEM.value = currStage.MemWrite.value;
        _.MemRead_MEM.value = currStage.MemRead.value;
        _.Zero_MEM.value = currStage.Zero.value;
        _.Reg2Data_MEM.value = currStage.Reg2Data.value;
        _.BranchCond_MEM.value = (currStage.Branch.value && currStage.Zero.value) ? 1 : 0;

        _.MemReadResult_MEM.value = 0;

        // Forward IR
        this.stageRegisters.MEMtoWB.IR.value = currStage.IR.value;

        // Forward ALUResult
        this.stageRegisters.MEMtoWB.ALUResult.value = _.ALUResult_MEM.value = currStage.ALUResult.value;

        // Forward WriteRegister
        this.stageRegisters.MEMtoWB.WriteRegister.value = _.WriteRegister_MEM.value = currStage.WriteRegister.value;

        // Control Signals
        this.stageRegisters.MEMtoWB.RegWrite.value = _.RegWrite_MEM.value = currStage.RegWrite.value;
        this.stageRegisters.MEMtoWB.MemtoReg.value = _.MemtoReg_MEM.value = currStage.MemtoReg.value;

        // Memory
        // Use the address as an unsigned 32-bit integer
        const address = currStage.ALUResult.value >>> 0;

        if (currStage.MemWrite.value) {
            // Check if address is valid, if not throw an error and halt the program
            if (address < 0 || address + 3 >= this.options.dataMemorySize) {
                this.halt();
                throw new Error(`Memory Access Violation: Can't write 4 bytes from address 0x${decToHex(address, 8)}`);
            }
            for (let i = 0; i < 4; i++) {
                const byteAddress = address + i;
                this.dataMemory[byteAddress] = (currStage.Reg2Data.value >> (i * 8)) & 0xFF;
            }
        }

        if (currStage.MemRead.value) {
            // Check if address is valid, if not throw an error and halt the program
            if (address < 0 || address + 3 >= this.options.dataMemorySize) {
                this.halt();
                throw new Error(`Memory Access Violation: Can't read 4 bytes from address 0x${address.toString(16).toUpperCase()}`);
            }
            // Load 4 bytes from memory
            this.stageRegisters.MEMtoWB.MemReadResult.value = _.MemReadResult_MEM.value =
                (this.dataMemory[address] |
                    (this.dataMemory[address + 1] << 8) |
                    (this.dataMemory[address + 2] << 16) |
                    (this.dataMemory[address + 3] << 24)) >>> 0; // Ensure unsigned 32-bit integer
        }

    }

    writeback() {
        let currStage = this.stageRegisters.MEMtoWB;

        _.IR_WB.value = currStage.IR.value;
        _.RegWrite_WB.value = currStage.RegWrite.value;
        _.MemtoReg_WB.value = currStage.MemtoReg.value;
        _.ALUResult_WB.value = currStage.ALUResult.value;
        _.MemReadResult_WB.value = currStage.MemReadResult.value;
        _.WriteRegister_WB.value = currStage.WriteRegister.value;
        _.WriteRegisterData_WB.value = 0;
        // Writeback
        if (currStage.RegWrite.value) {
            // Check if the write register 0
            if (currStage.WriteRegister.value === 0) return;
            const value = currStage.MemtoReg.value ? currStage.MemReadResult.value : currStage.ALUResult.value;
            _.WriteRegisterData_WB.value = this.registerFile[currStage.WriteRegister.value] = value;
        }
    }


    halt() {
        this.halted = true;
    }

}

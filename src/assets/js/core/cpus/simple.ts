/** @format */

import { GateType, InstructionType } from "../../types/enums";
import { Adder } from "../components/Adder";
import { ALU } from "../components/ALU";
import { ALUControl } from "../components/ALUControl";
import { Constant } from "../components/Constant";
import { ControlUnit } from "../components/ControlUnit";
import { DataMemory } from "../components/DataMemory";
import { Gate } from "../components/Gate";
import { InstructionMemory } from "../components/InstructionMemory";
import { MUX } from "../components/MUX";
import { PC } from "../components/PC";
import { RegisterControlUnit } from "../components/RegisterControlUnit";
import { ShiftLeft } from "../components/ShiftLeft";
import { SignExtender } from "../components/SignExtender";

const CONTROL_SIGNALS = {
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

const INSTRUCTION_CONFIG: InstructionConfig[] = [
    {
        opcode: 0x00,
        mnemonic: "add",
        type: InstructionType.R,
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
        type: InstructionType.I,
        controlSignals: {
            ALUSrc: 1,
            RegWrite: 1,
            ALUOp: 0,
        },
    },
    {
        opcode: 0x23,
        mnemonic: "lw",
        type: InstructionType.I,
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
        type: InstructionType.I,
        controlSignals: {
            ALUSrc: 1,
            MemWrite: 1,
            ALUOp: 0,
        },
    },
    {
        opcode: 0x04,
        mnemonic: "beq",
        type: InstructionType.I,
        controlSignals: {
            ALUOp: 1,
            Branch: 1,
        },
    },
];

const cpuConfig: CPUConfig = {
    controlSignals: Object.values(CONTROL_SIGNALS),
    instructions: INSTRUCTION_CONFIG,
    stages: [
        {
            id: "IF",
            name: "Instruction Fetch",
            description: "Fetches the next instruction from memory",
            activateOnClock: "RISING_EDGE",
        },
        {
            id: "ID",
            name: "Instruction Decode",
            description: "Decodes the instruction and reads the register file",
            activateOnClock: "FALLING_EDGE",
        },
        {
            id: "EX",
            name: "Execution",
            description: "Executes the instruction",
            activateOnClock: "RISING_EDGE",
        },
        {
            id: "MEM",
            name: "Memory Access",
            description: "Reads or writes data from/to memory",
            activateOnClock: "RISING_EDGE",
        },
        {
            id: "WB",
            name: "Write Back",
            description: "Writes the result back to the register file",
            activateOnClock: "RISING_EDGE",
        },
    ],

    stageRegisters: [
        {
            id: "IFtoID",
            name: "IF/ID",
            ports: [
                { name: "Instruction", bits: 32 },
                { name: "PC", bits: 32 },
            ],
        },
        {
            id: "IDtoEX",
            name: "ID/EX",
            ports: [
                { name: "Instruction", bits: 32 },
                { name: "ReadData1", bits: 32 },
                { name: "ReadData2", bits: 32 },
                { name: "SignExtendedImm", bits: 32 },
                { name: "rt", bits: 5 },
                { name: "rd", bits: 5 },
                { name: "PC", bits: 32 },

                CONTROL_SIGNALS.RegDst,
                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,
                CONTROL_SIGNALS.MemWrite,
                CONTROL_SIGNALS.MemRead,
                CONTROL_SIGNALS.Branch,
                CONTROL_SIGNALS.ALUOp,
                CONTROL_SIGNALS.ALUSrc,
            ],
        },
        {
            id: "EXtoMEM",
            name: "EX/MEM",
            ports: [
                { name: "Instruction", bits: 32 },
                { name: "ALUResult", bits: 32 },
                { name: "ReadData2", bits: 32 },
                { name: "WriteData", bits: 32 },
                { name: "PC", bits: 32 },

                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,
                CONTROL_SIGNALS.MemWrite,
                CONTROL_SIGNALS.MemRead,
                CONTROL_SIGNALS.Branch,
            ],
        },
        {
            id: "MEMtoWB",
            name: "MEM/WB",
            ports: [{ name: "Instruction", bits: 32 }, { name: "ALUResult", bits: 32 }, { name: "ReadData", bits: 32 }, CONTROL_SIGNALS.RegWrite, CONTROL_SIGNALS.MemtoReg],
        },
    ],

    components: [
        // IF
        new PC(),
        new InstructionMemory(),

        new Constant("Const4", 4, 32),
        new Adder("NextPCAdder", 2, 32),

        // ID
        new ControlUnit(Object.values(CONTROL_SIGNALS), INSTRUCTION_CONFIG),
        new RegisterControlUnit(),
        new SignExtender("ImmExtend"),

        // EX
        new ShiftLeft("ShiftLeft", 32),
        new Adder("BranchAdder", 2, 32),

        new MUX("ALUSrcMUX", CONTROL_SIGNALS.ALUSrc, 2, 32),
        new ALU(),
        new ALUControl(),

        new MUX("RegDstMUX", CONTROL_SIGNALS.RegDst, 2, 5),

        // MEM
        new Gate("BranchAndGate", GateType.AND, 2, 1),
        new MUX("BranchMUX", CONTROL_SIGNALS.Branch, 2, 32),

        new DataMemory(),

        // WB
        new MUX("MemtoRegMUX", CONTROL_SIGNALS.MemtoReg, 2, 32),
    ],

    connections: [
        // IF
        { from: "PC.Output", to: "InstructionMemory.Address", bitRange: [31, 0] },
        { from: "InstructionMemory.Instruction", to: "IFtoID.Instruction", bitRange: [31, 0] },
        { from: "PC.Output", to: "NextPCAdder.in1", bitRange: [31, 0] },
        { from: "Const4.out", to: "NextPCAdder.in2", bitRange: [31, 0] },
        { from: "NextPCAdder.out", to: "IFtoID.PC", bitRange: [31, 0] },
        { from: "NextPCAdder.out", to: "BranchAdder.in2", bitRange: [31, 0] },

        // ID
        { from: "IFtoID.Instruction", to: "IDtoEX.Instruction", bitRange: [31, 0] },
        { from: "IFtoID.PC", to: "IDtoEX.PC", bitRange: [31, 0] },
        { from: "IFtoID.Instruction", to: "ControlUnit.Opcode", bitRange: [31, 26] },
        { from: "IFtoID.Instruction", to: "RegisterControlUnit.ReadRegister1", bitRange: [25, 21] },
        { from: "IFtoID.Instruction", to: "RegisterControlUnit.ReadRegister2", bitRange: [20, 16] },
        { from: "IFtoID.Instruction", to: "ImmExtend.Input", bitRange: [15, 0] },

        { from: "RegisterControlUnit.ReadData1", to: "IDtoEX.ReadData1", bitRange: [31, 0] },
        { from: "RegisterControlUnit.ReadData2", to: "IDtoEX.ReadData2", bitRange: [31, 0] },
        { from: "ImmExtend.Output", to: "IDtoEX.SignExtendedImm", bitRange: [31, 0] },
        { from: "IFtoID.Instruction", to: "IDtoEX.rt", bitRange: [20, 16] },
        { from: "IFtoID.Instruction", to: "IDtoEX.rd", bitRange: [15, 11] },

        { from: "ControlUnit.RegWrite", to: "IDtoEX.RegWrite", bitRange: [0, 0] },
        { from: "ControlUnit.MemtoReg", to: "IDtoEX.MemtoReg", bitRange: [0, 0] },
        { from: "ControlUnit.MemWrite", to: "IDtoEX.MemWrite", bitRange: [0, 0] },
        { from: "ControlUnit.MemRead", to: "IDtoEX.MemRead", bitRange: [0, 0] },
        { from: "ControlUnit.Branch", to: "IDtoEX.Branch", bitRange: [0, 0] },
        { from: "ControlUnit.ALUOp", to: "IDtoEX.ALUOp", bitRange: [1, 0] },
        { from: "ControlUnit.ALUSrc", to: "IDtoEX.ALUSrc", bitRange: [0, 0] },
        { from: "ControlUnit.RegDst", to: "IDtoEX.RegDst", bitRange: [0, 0] },

        // EX

        // { from: 'IDtoEX.ReadData2', to: 'ShiftLeft.in', bitRange: [31, 0] },
    ],
};

const cpuLayout: CPULayout = {
    width: 1200,
    height: 800,
    components: [
        { id: "IFtoID", dimensions: { width: 50, height: 300 }, pos: { x: 294, y: 149 }, ports: [] },
        { id: "IDtoEX", dimensions: { width: 50, height: 300 }, pos: { x: 593, y: 132 }, ports: [] },
        { id: "EXtoMEM", dimensions: { width: 50, height: 300 }, pos: { x: 876, y: 147 }, ports: [] },
        { id: "MEMtoWB", dimensions: { width: 50, height: 300 }, pos: { x: 1080, y: 124 }, ports: [] },
        { id: "PC", dimensions: { width: 50, height: 50 }, pos: { x: 49, y: 225 }, ports: [] },
        { id: "InstructionMemory", dimensions: { width: 100, height: 150 }, pos: { x: 143, y: 220 }, ports: [] },
        { id: "Const4", dimensions: { width: 50, height: 50 }, pos: { x: 202, y: 57 }, ports: [] },
        { id: "NextPCAdder", dimensions: { width: 50, height: 50 }, pos: { x: 289, y: 49 }, ports: [] },
        { id: "ControlUnit", dimensions: { width: 50, height: 100 }, pos: { x: 405, y: 89 }, ports: [] },
        { id: "RegisterControlUnit", dimensions: { width: 120, height: 200 }, pos: { x: 404, y: 216 }, ports: [] },
        { id: "ImmExtend", dimensions: { width: 50, height: 50 }, pos: { x: 440, y: 449 }, ports: [] },
        { id: "ShiftLeft", dimensions: { width: 50, height: 50 }, pos: { x: 699, y: 105 }, ports: [] },
        { id: "BranchAdder", dimensions: { width: 25, height: 25 }, pos: { x: 774, y: 75 }, ports: [] },
        { id: "ALUSrcMUX", dimensions: { width: 25, height: 50 }, pos: { x: 716, y: 277 }, ports: [] },
        { id: "ALU", dimensions: { width: 50, height: 100 }, pos: { x: 782, y: 216 }, ports: [] },
        { id: "ALUControl", dimensions: { width: 50, height: 50 }, pos: { x: 782, y: 355 }, ports: [] },
        { id: "RegDstMUX", dimensions: { width: 25, height: 50 }, pos: { x: 696, y: 468 }, ports: [] },
        { id: "BranchAndGate", dimensions: { width: 50, height: 50 }, pos: { x: 959, y: 80 }, ports: [] },
        { id: "BranchMUX", dimensions: { width: 25, height: 50 }, pos: { x: 1039, y: 44 }, ports: [] },
        { id: "DataMemory", dimensions: { width: 100, height: 150 }, pos: { x: 958, y: 191 }, ports: [] },
        { id: "MemtoRegMUX", dimensions: { width: 25, height: 50 }, pos: { x: 1161, y: 331 }, ports: [] },
    ],
};

export { cpuConfig, cpuLayout };

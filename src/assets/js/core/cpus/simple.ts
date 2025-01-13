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
        name: 'RegWrite',
    },
    MemtoReg: {
        bits: 1,
        name: 'MemtoReg',
    },
    MemWrite: {
        bits: 1,
        name: 'MemWrite',
    },
    MemRead: {
        bits: 1,
        name: 'MemRead',
    },
    Branch: {
        bits: 1,
        name: 'Branch',
    },
    ALUOp: {
        bits: 2,
        name: 'ALUOp',
    },
    ALUSrc: {
        bits: 1,
        name: 'ALUSrc',
    },
    RegDst: {
        bits: 1,
        name: 'RegDst',
    },
}

const INSTRUCTION_CONFIG: InstructionConfig[] = [
    {
        opcode: 0x00,
        mnemonic: 'add',
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
        mnemonic: 'addi',
        type: InstructionType.I,
        controlSignals: {
            ALUSrc: 1,
            RegWrite: 1,
            ALUOp: 0,
        }
    },
    {
        opcode: 0x23,
        mnemonic: 'lw',
        type: InstructionType.I,
        controlSignals: {
            ALUSrc: 1,
            MemtoReg: 1,
            MemRead: 1,
            RegWrite: 1,
            ALUOp: 0,
        }
    },
    {
        opcode: 0x2B,
        mnemonic: 'sw',
        type: InstructionType.I,
        controlSignals: {
            ALUSrc: 1,
            MemWrite: 1,
            ALUOp: 0,
        }
    },
    {
        opcode: 0x04,
        mnemonic: 'beq',
        type: InstructionType.I,
        controlSignals: {
            ALUOp: 1,
            Branch: 1,
        }
    }
];

const cpuConfig: CPUConfig = {
    controlSignals: Object.values(CONTROL_SIGNALS),
    instructions: INSTRUCTION_CONFIG,
    stages: [{
        id: 'IF',
        name: 'Instruction Fetch',
        description: 'Fetches the next instruction from memory',
        activateOnClock: 'RISING_EDGE',
    }, {
        id: 'ID',
        name: 'Instruction Decode',
        description: 'Decodes the instruction and reads the register file',
        activateOnClock: 'FALLING_EDGE',
    }, {
        id: 'EX',
        name: 'Execution',
        description: 'Executes the instruction',
        activateOnClock: 'RISING_EDGE',
    }, {
        id: 'MEM',
        name: 'Memory Access',
        description: 'Reads or writes data from/to memory',
        activateOnClock: 'RISING_EDGE',
    }, {
        id: 'WB',
        name: 'Write Back',
        description: 'Writes the result back to the register file',
        activateOnClock: 'RISING_EDGE',
    }],

    stageRegisters: [
        {
            id: 'IFtoID',
            name: 'IF/ID',
            ports: [
                { name: 'Instruction', bits: 32 },
                { name: 'PC', bits: 32 },
            ]
        },
        {
            id: 'IDtoEX',
            name: 'ID/EX',
            ports: [
                { name: 'Instruction', bits: 32 },
                { name: 'ReadData1', bits: 32 },
                { name: 'ReadData2', bits: 32 },
                { name: 'SignExtendedImm', bits: 32 },
                { name: 'rt', bits: 5 },
                { name: 'rd', bits: 5 },
                { name: 'PC', bits: 32 },

                CONTROL_SIGNALS.RegDst,
                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,
                CONTROL_SIGNALS.MemWrite,
                CONTROL_SIGNALS.MemRead,
                CONTROL_SIGNALS.Branch,
                CONTROL_SIGNALS.ALUOp,
                CONTROL_SIGNALS.ALUSrc,


            ]
        },
        {
            id: 'EXtoMEM',
            name: 'EX/MEM',
            ports: [
                { name: 'Instruction', bits: 32 },
                { name: 'ALUResult', bits: 32 },
                { name: 'ReadData2', bits: 32 },
                { name: 'WriteData', bits: 32 },
                { name: 'PC', bits: 32 },

                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,
                CONTROL_SIGNALS.MemWrite,
                CONTROL_SIGNALS.MemRead,
                CONTROL_SIGNALS.Branch,
            ]
        },
        {
            id: 'MEMtoWB',
            name: 'MEM/WB',
            ports: [
                { name: 'Instruction', bits: 32 },
                { name: 'ALUResult', bits: 32 },
                { name: 'ReadData', bits: 32 },

                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,

            ]
        },

    ],

    components: [

        // IF
        new PC(),
        new InstructionMemory(),

        new Constant('Const4', 4, 32),
        new Adder('NextPCAdder', 2, 32),

        // ID
        new ControlUnit(Object.values(CONTROL_SIGNALS), INSTRUCTION_CONFIG),
        new RegisterControlUnit(),
        new SignExtender('ImmExtend'),

        // EX
        new ShiftLeft('ShiftLeft', 32),
        new Adder('BranchAdder', 2, 32),

        new MUX('ALUSrcMUX', CONTROL_SIGNALS.ALUSrc, 2, 32),
        new ALU(),
        new ALUControl(),

        new MUX('RegDstMUX', CONTROL_SIGNALS.RegDst, 2, 5),

        // MEM
        new Gate('BranchAndGate', GateType.AND, 2, 1),
        new MUX('BranchMUX', CONTROL_SIGNALS.Branch, 2, 32),

        new DataMemory(),

        // WB
        new MUX('MemtoRegMUX', CONTROL_SIGNALS.MemtoReg, 2, 32),





    ],

    connections: [
        // IF
        { from: 'PC.Output', to: 'InstructionMemory.Address', bitRange: [31, 0] },
        { from: 'InstructionMemory.Instruction', to: 'IFtoID.Instruction', bitRange: [31, 0] },
        { from: 'PC.Output', to: 'NextPCAdder.in1', bitRange: [31, 0] },
        { from: 'Const4.out', to: 'NextPCAdder.in2', bitRange: [31, 0] },
        { from: 'NextPCAdder.out', to: 'IFtoID.PC', bitRange: [31, 0] },
        { from: 'NextPCAdder.out', to: 'BranchAdder.in2', bitRange: [31, 0] },

        // ID
        { from: 'IFtoID.Instruction', to: 'IDtoEX.Instruction', bitRange: [31, 0] },
        { from: 'IFtoID.PC', to: 'IDtoEX.PC', bitRange: [31, 0] },
        { from: 'IFtoID.Instruction', to: 'ControlUnit.Opcode', bitRange: [31, 26] },
        { from: 'IFtoID.Instruction', to: 'RegisterControlUnit.ReadRegister1', bitRange: [25, 21] },
        { from: 'IFtoID.Instruction', to: 'RegisterControlUnit.ReadRegister2', bitRange: [20, 16] },
        { from: 'IFtoID.Instruction', to: 'ImmExtend.Input', bitRange: [15, 0] },

        { from: 'RegisterControlUnit.ReadData1', to: 'IDtoEX.ReadData1', bitRange: [31, 0] },
        { from: 'RegisterControlUnit.ReadData2', to: 'IDtoEX.ReadData2', bitRange: [31, 0] },
        { from: 'ImmExtend.Output', to: 'IDtoEX.SignExtendedImm', bitRange: [31, 0] },
        { from: 'IFtoID.Instruction', to: 'IDtoEX.rt', bitRange: [20, 16] },
        { from: 'IFtoID.Instruction', to: 'IDtoEX.rd', bitRange: [15, 11] },

        { from: 'ControlUnit.RegWrite', to: 'IDtoEX.RegWrite', bitRange: [0, 0] },
        { from: 'ControlUnit.MemtoReg', to: 'IDtoEX.MemtoReg', bitRange: [0, 0] },
        { from: 'ControlUnit.MemWrite', to: 'IDtoEX.MemWrite', bitRange: [0, 0] },
        { from: 'ControlUnit.MemRead', to: 'IDtoEX.MemRead', bitRange: [0, 0] },
        { from: 'ControlUnit.Branch', to: 'IDtoEX.Branch', bitRange: [0, 0] },
        { from: 'ControlUnit.ALUOp', to: 'IDtoEX.ALUOp', bitRange: [1, 0] },
        { from: 'ControlUnit.ALUSrc', to: 'IDtoEX.ALUSrc', bitRange: [0, 0] },
        { from: 'ControlUnit.RegDst', to: 'IDtoEX.RegDst', bitRange: [0, 0] },

        // EX

        // { from: 'IDtoEX.ReadData2', to: 'ShiftLeft.in', bitRange: [31, 0] },





    ]

}

const cpuLayout: CPULayout =
{
    width: 1200, height: 800,
    components: [{ id: "IFtoID", dimensions: { width: 50, height: 50 }, pos: { x: 370, y: 279 }, ports: [{ name: "Instruction", location: "right", relPos: 0.5, pos: { x: 420, y: 304 } }, { name: "PC", location: "right", relPos: 0.5, pos: { x: 420, y: 304 } }] }, { id: "IDtoEX", dimensions: { width: 50, height: 50 }, pos: { x: 454, y: 267 }, ports: [{ name: "Instruction", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "ReadData1", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "ReadData2", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "SignExtendedImm", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "rt", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "rd", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "PC", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "RegDst", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "RegWrite", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "MemtoReg", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "MemWrite", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "MemRead", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "Branch", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "ALUOp", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }, { name: "ALUSrc", location: "right", relPos: 0.5, pos: { x: 504, y: 292 } }] }, { id: "EXtoMEM", dimensions: { width: 50, height: 50 }, pos: { x: 566, y: 336 }, ports: [{ name: "Instruction", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "ALUResult", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "ReadData2", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "WriteData", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "PC", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "RegWrite", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "MemtoReg", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "MemWrite", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "MemRead", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }, { name: "Branch", location: "right", relPos: 0.5, pos: { x: 616, y: 361 } }] }, { id: "MEMtoWB", dimensions: { width: 50, height: 50 }, pos: { x: 646, y: 335 }, ports: [{ name: "Instruction", location: "right", relPos: 0.5, pos: { x: 696, y: 360 } }, { name: "ALUResult", location: "right", relPos: 0.5, pos: { x: 696, y: 360 } }, { name: "ReadData", location: "right", relPos: 0.5, pos: { x: 696, y: 360 } }, { name: "RegWrite", location: "right", relPos: 0.5, pos: { x: 696, y: 360 } }, { name: "MemtoReg", location: "right", relPos: 0.5, pos: { x: 696, y: 360 } }] }, { id: "PC", dimensions: { width: 50, height: 50 }, pos: { x: 70, y: 50 }, ports: [{ name: "Input", location: "left", relPos: 0.52, pos: { x: 70, y: 76 } }, { name: "Output", location: "right", relPos: 0.5, pos: { x: 120, y: 75 } }] }, { id: "InstructionMemory", dimensions: { width: 50, height: 50 }, pos: { x: 177, y: 55 }, ports: [{ name: "Address", location: "right", relPos: 0.5, pos: { x: 227, y: 80 } }, { name: "Instruction", location: "right", relPos: 0.5, pos: { x: 227, y: 80 } }] }, { id: "Const4", dimensions: { width: 50, height: 50 }, pos: { x: 250, y: 50 }, ports: [{ name: "out", location: "right", relPos: 0.5, pos: { x: 300, y: 75 } }] }, { id: "NextPCAdder", dimensions: { width: 50, height: 50 }, pos: { x: 350, y: 50 }, ports: [{ name: "in1", location: "right", relPos: 0.5, pos: { x: 400, y: 75 } }, { name: "in2", location: "right", relPos: 0.5, pos: { x: 400, y: 75 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 400, y: 75 } }] }, { id: "ControlUnit", dimensions: { width: 50, height: 50 }, pos: { x: 450, y: 50 }, ports: [{ name: "Opcode", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "RegWrite", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "MemtoReg", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "MemWrite", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "MemRead", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "Branch", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "ALUOp", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "ALUSrc", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }, { name: "RegDst", location: "right", relPos: 0.5, pos: { x: 500, y: 75 } }] }, { id: "RegisterControlUnit", dimensions: { width: 50, height: 50 }, pos: { x: 550, y: 50 }, ports: [{ name: "RegWrite", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "ReadRegister1", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "ReadRegister2", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "WriteRegister", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "WriteData", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "ReadData1", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }, { name: "ReadData2", location: "right", relPos: 0.5, pos: { x: 600, y: 75 } }] }, { id: "ImmExtend", dimensions: { width: 50, height: 50 }, pos: { x: 650, y: 50 }, ports: [{ name: "Input", location: "right", relPos: 0.5, pos: { x: 700, y: 75 } }, { name: "Output", location: "right", relPos: 0.5, pos: { x: 700, y: 75 } }] }, { id: "ShiftLeft", dimensions: { width: 50, height: 50 }, pos: { x: 750, y: 50 }, ports: [{ name: "Input", location: "right", relPos: 0.5, pos: { x: 800, y: 75 } }, { name: "Output", location: "right", relPos: 0.5, pos: { x: 800, y: 75 } }] }, { id: "BranchAdder", dimensions: { width: 50, height: 50 }, pos: { x: 269, y: 266 }, ports: [{ name: "in1", location: "left", relPos: 0.32, pos: { x: 269, y: 282 } }, { name: "in2", location: "left", relPos: 0.78, pos: { x: 269, y: 305 } }, { name: "out", location: "right", relPos: 0.52, pos: { x: 319, y: 292 } }] }, { id: "ALUSrcMUX", dimensions: { width: 50, height: 50 }, pos: { x: 125, y: 241 }, ports: [{ name: "ALUSrc", location: "top", relPos: 0.54, pos: { x: 152, y: 241 } }, { name: "in1", location: "left", relPos: 1, pos: { x: 125, y: 291 } }, { name: "in2", location: "left", relPos: 0.64, pos: { x: 125, y: 273 } }, { name: "in3", location: "left", relPos: 0.36, pos: { x: 125, y: 259 } }, { name: "in4", location: "right", relPos: 0, pos: { x: 175, y: 241 } }, { name: "in5", location: "right", relPos: 0, pos: { x: 175, y: 241 } }, { name: "in6", location: "right", relPos: 0.16, pos: { x: 175, y: 249 } }, { name: "in7", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in8", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in9", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in10", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in11", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in12", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in13", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in14", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in15", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in16", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in17", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in18", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in19", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in20", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in21", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in22", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in23", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in24", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in25", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in26", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in27", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in28", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in29", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in30", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in31", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "in32", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 175, y: 266 } }] }, { id: "ALU", dimensions: { width: 50, height: 50 }, pos: { x: 250, y: 150 }, ports: [{ name: "Operation", location: "right", relPos: 0.5, pos: { x: 300, y: 175 } }, { name: "A", location: "right", relPos: 0.5, pos: { x: 300, y: 175 } }, { name: "B", location: "right", relPos: 0.5, pos: { x: 300, y: 175 } }, { name: "Result", location: "right", relPos: 0.5, pos: { x: 300, y: 175 } }, { name: "Zero", location: "right", relPos: 0.5, pos: { x: 300, y: 175 } }] }, { id: "ALUControl", dimensions: { width: 50, height: 50 }, pos: { x: 350, y: 150 }, ports: [{ name: "Opcode", location: "right", relPos: 0.5, pos: { x: 400, y: 175 } }, { name: "Funct", location: "right", relPos: 0.5, pos: { x: 400, y: 175 } }, { name: "Operation", location: "right", relPos: 0.5, pos: { x: 400, y: 175 } }] }, { id: "RegDstMUX", dimensions: { width: 50, height: 50 }, pos: { x: 450, y: 150 }, ports: [{ name: "RegDst", location: "right", relPos: 0.5, pos: { x: 500, y: 175 } }, { name: "in1", location: "right", relPos: 0.5, pos: { x: 500, y: 175 } }, { name: "in2", location: "right", relPos: 0.5, pos: { x: 500, y: 175 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 500, y: 175 } }] }, { id: "BranchAndGate", dimensions: { width: 50, height: 50 }, pos: { x: 550, y: 150 }, ports: [{ name: "in1", location: "right", relPos: 0.5, pos: { x: 600, y: 175 } }, { name: "in2", location: "right", relPos: 0.5, pos: { x: 600, y: 175 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 600, y: 175 } }] }, { id: "BranchMUX", dimensions: { width: 50, height: 50 }, pos: { x: 650, y: 150 }, ports: [{ name: "Branch", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in1", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in2", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in3", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in4", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in5", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in6", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in7", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in8", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in9", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in10", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in11", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in12", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in13", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in14", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in15", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in16", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in17", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in18", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in19", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in20", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in21", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in22", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in23", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in24", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in25", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in26", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in27", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in28", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in29", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in30", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in31", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "in32", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 700, y: 175 } }] }, { id: "DataMemory", dimensions: { width: 50, height: 50 }, pos: { x: 750, y: 150 }, ports: [{ name: "MemWrite", location: "right", relPos: 0.5, pos: { x: 800, y: 175 } }, { name: "MemRead", location: "right", relPos: 0.5, pos: { x: 800, y: 175 } }, { name: "Address", location: "right", relPos: 0.5, pos: { x: 800, y: 175 } }, { name: "WriteData", location: "right", relPos: 0.5, pos: { x: 800, y: 175 } }, { name: "ReadData", location: "right", relPos: 0.5, pos: { x: 800, y: 175 } }] }, { id: "MemtoRegMUX", dimensions: { width: 50, height: 50 }, pos: { x: 384, y: 369 }, ports: [{ name: "MemtoReg", location: "top", relPos: 0.5, pos: { x: 409, y: 369 } }, { name: "in1", location: "left", relPos: 0.78, pos: { x: 384, y: 408 } }, { name: "in2", location: "left", relPos: 0.28, pos: { x: 384, y: 383 } }, { name: "in3", location: "bottom", relPos: 0.84, pos: { x: 426, y: 419 } }, { name: "in4", location: "left", relPos: 0.44, pos: { x: 384, y: 391 } }, { name: "in5", location: "bottom", relPos: 0.28, pos: { x: 398, y: 419 } }, { name: "in6", location: "bottom", relPos: 0.18, pos: { x: 393, y: 419 } }, { name: "in7", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in8", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in9", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in10", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in11", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in12", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in13", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in14", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in15", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in16", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in17", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in18", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in19", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in20", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in21", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in22", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in23", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in24", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in25", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in26", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in27", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in28", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in29", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in30", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in31", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "in32", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }, { name: "out", location: "right", relPos: 0.5, pos: { x: 434, y: 394 } }] }]
}


export { cpuConfig, cpuLayout };
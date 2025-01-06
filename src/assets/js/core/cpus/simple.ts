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
    ALUControl: {
        bits: 2,
        name: 'ALUControl',
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
                { name: 'ReadData1', bits: 32 },
                { name: 'ReadData2', bits: 32 },
                { name: 'SignExtendedImm', bits: 32 },
                { name: 'PC', bits: 32 },
                { name: 'Instruction', bits: 32 },

                CONTROL_SIGNALS.ALUControl,
                CONTROL_SIGNALS.RegDst,
                CONTROL_SIGNALS.RegWrite,
                CONTROL_SIGNALS.MemtoReg,
                CONTROL_SIGNALS.MemWrite,
                CONTROL_SIGNALS.MemRead,
                CONTROL_SIGNALS.Branch,
                CONTROL_SIGNALS.ALUSrc,


            ]
        },
        {
            id: 'EXtoMEM',
            name: 'EX/MEM',
            ports: [
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

        new MUX('ALUSrcMUX', CONTROL_SIGNALS.ALUSrc, 32, 32),
        new ALU(),
        new ALUControl(),

        new MUX('RegDstMUX', CONTROL_SIGNALS.RegDst, 2, 5),

        // MEM
        new Gate('BranchAndGate', GateType.AND, 2, 1),
        new MUX('BranchMUX', CONTROL_SIGNALS.Branch, 32, 32),

        new DataMemory(),

        // WB
        new MUX('MemtoRegMUX', CONTROL_SIGNALS.MemtoReg, 32, 32),





    ],

    connections: [
        // IF
        { from: 'PC.out', to: 'InstructionMemory.Address', bitRange: [0, 31] },
        { from: 'InstructionMemory.Instruction', to: 'IFtoID.Instruction', bitRange: [0, 31] },
        { from: 'PC.out', to: 'NextPCAdder.in1', bitRange: [0, 31] },
        { from: 'Const4.out', to: 'NextPCAdder.in2', bitRange: [0, 31] },
        { from: 'NextPCAdder.out', to: 'IFtoID.PC', bitRange: [0, 31] },

        // ID
        { from: 'IFtoID.Instruction', to: 'IDtoEX.Instruction', bitRange: [0, 31] },
        { from: 'IFtoID.PC', to: 'IDtoEX.PC', bitRange: [0, 31] },
        { from: 'IDtoEX.Instruction', to: 'ControlUnit.Instruction', bitRange: [0, 31] },
        { from: 'IDtoEX.Instruction', to: 'RegisterControlUnit.ReadRegister1', bitRange: [15, 19] },
        { from: 'IDtoEX.Instruction', to: 'RegisterControlUnit.ReadRegister2', bitRange: [20, 24] },
        { from: 'IDtoEX.Instruction', to: 'RegisterControlUnit.WriteRegister', bitRange: [7, 11] },
        { from: 'IDtoEX.Instruction', to: 'SignExtender.In', bitRange: [0, 15] },
        { from: 'IDtoEX.Instruction', to: 'ShiftLeft.In', bitRange: [0, 15] },
        { from: 'IDtoEX.Instruction', to: 'ALUControl.Instruction', bitRange: [0, 6] },

        { from: 'RegisterControlUnit.ReadData1', to: 'IDtoEX.ReadData1', bitRange: [0, 31] },
        { from: 'RegisterControlUnit.ReadData2', to: 'IDtoEX.ReadData2', bitRange: [0, 31] },
        { from: 'SignExtender.Out', to: 'IDtoEX.SignExtendedImm', bitRange: [0, 31] },
        { from: 'IDtoEX.PC', to: 'IDtoEX.PC', bitRange: [0, 31] },
        { from: 'IDtoEX.Instruction', to: 'IDtoEX.Instruction', bitRange: [0, 31] },
        { from: 'ControlUnit.out', to: 'IDtoEX.RegWrite', bitRange: [0, 0] },
        { from: 'ControlUnit.out', to: 'IDtoEX.MemtoReg', bitRange: [1, 1] },
        { from: 'ControlUnit.out', to: 'IDtoEX.MemWrite', bitRange: [2, 2] },
        { from: 'ControlUnit.out', to: 'IDtoEX.MemRead', bitRange: [3, 3] },
        { from: 'ControlUnit.out', to: 'IDtoEX.Branch', bitRange: [4, 4] },
        { from: 'ALUControl.out', to: 'IDtoEX.ALUControl', bitRange: [0, 1] },
        { from: 'ControlUnit.out', to: 'IDtoEX.ALUSrc', bitRange: [5, 5] },
        { from: 'ControlUnit.out', to: 'IDtoEX.RegDst', bitRange: [6, 6] },

        // EX
        { from: 'IDtoEX.ReadData2', to: 'EXtoMEM.ReadData2', bitRange: [0, 31] },
        { from: 'IDtoEX.SignExtendedImm', to: 'EXtoMEM.WriteData', bitRange: [0, 31] },
        { from: 'IDtoEX.PC', to: 'EXtoMEM.PC', bitRange: [0, 31] },
        { from: 'IDtoEX.Instruction', to: 'EXtoMEM.Instruction', bitRange: [0, 31] },
        { from: 'IDtoEX.ALUControl', to: 'ALUControl.Control', bitRange: [0, 1] },
        { from: 'IDtoEX.RegDst', to: 'EXtoMEM.RegDst', bitRange: [0, 0] },
        { from: 'IDtoEX.RegWrite', to: 'EXtoMEM.RegWrite', bitRange: [0, 0] },
        { from: 'IDtoEX.MemtoReg', to: 'EXtoMEM.MemtoReg', bitRange: [0, 0] },
        { from: 'IDtoEX.MemWrite', to: 'EXtoMEM.MemWrite', bitRange: [0, 0] },
        { from: 'IDtoEX.MemRead', to: 'EXtoMEM.MemRead', bitRange: [0, 0] },
        { from: 'IDtoEX.Branch', to: 'EXtoMEM.Branch', bitRange: [0, 0] },
        { from: 'IDtoEX.ALUSrc', to: 'ALUSrcMUX.Select', bitRange: [0, 0] },
        { from: 'IDtoEX.ReadData2', to: 'ALUSrcMUX.In1', bitRange: [0, 31] },
        { from: 'IDtoEX.SignExtendedImm', to: 'ALUSrcMUX.In2', bitRange: [0, 31] },
        { from: 'ALUSrcMUX.Out', to: 'ALU.in1', bitRange: [0, 31] },
        { from: 'IDtoEX.ReadData1', to: 'ALU.in2', bitRange: [0, 31] },
        { from: 'IDtoEX.Instruction', to: 'ShiftLeft.In', bitRange: [0, 15] },
        { from: 'ShiftLeft.Out', to: 'BranchAdder.in1', bitRange: [0, 31] },
        { from: 'IDtoEX.PC', to: 'BranchAdder.in2', bitRange: [0, 31] },
        { from: 'BranchAdder.out', to: 'BranchMUX.In1', bitRange: [0, 31] },
        { from: 'IDtoEX.SignExtendedImm', to: 'BranchMUX.In2', bitRange: [0, 31] },
        { from: 'IDtoEX.Branch', to: 'BranchAndGate.In1', bitRange: [0, 0] },
        { from: 'ALU.Zero', to: 'BranchAndGate.In2', bitRange: [0, 0] },
        { from: 'BranchAndGate.Out', to: 'BranchMUX.Select', bitRange: [0, 0] },
        { from: 'BranchMUX.Out', to: 'EXtoMEM.PC', bitRange: [0, 31] },
        { from: 'ALU.out', to: 'EXtoMEM.ALUResult', bitRange: [0, 31] },

        // MEM
        { from: 'EXtoMEM.ALUResult', to: 'MEMtoWB.ALUResult', bitRange: [0, 31] },
        { from: 'EXtoMEM.ReadData2', to: 'DataMemory.Address', bitRange: [0, 31] },
        { from: 'EXtoMEM.WriteData', to: 'DataMemory.WriteData', bitRange: [0, 31] },
        { from: 'EXtoMEM.MemWrite', to: 'DataMemory.MemWrite', bitRange: [0, 0] },
        { from: 'EXtoMEM.MemRead', to: 'DataMemory.MemRead', bitRange: [0, 0] },
        { from: 'DataMemory.ReadData', to: 'MEMtoWB.ReadData', bitRange: [0, 31] },

        // WB
        { from: 'MEMtoWB.ALUResult', to: 'MemtoRegMUX.In1', bitRange: [0, 31] },
        { from: 'MEMtoWB.ReadData', to: 'MemtoRegMUX.In2', bitRange: [0, 31] },
        { from: 'EXtoMEM.MemtoReg', to: 'MemtoRegMUX.Select', bitRange: [0, 0] },
        { from: 'EXtoMEM.RegWrite', to: 'MemtoRegMUX.Select', bitRange: [0, 0] },
        { from: 'MemtoRegMUX.Out', to: 'RegisterControlUnit.WriteData', bitRange: [0, 31] },
        { from: 'EXtoMEM.RegWrite', to: 'RegisterControlUnit.RegWrite', bitRange: [0, 0] },
        { from: 'EXtoMEM.MemtoReg', to: 'RegisterControlUnit.MemtoReg', bitRange: [0, 0] },
    ]

}

const cpuLayout: CPULayout = {
    width: 800,
    height: 600,
    components: [
        { id: 'PC', dimensions: { width: 50, height: 50 }, pos: { x: 50, y: 50 } },
        { id: 'InstructionMemory', dimensions: { width: 50, height: 50 }, pos: { x: 150, y: 50 } },
        { id: 'Const4', dimensions: { width: 50, height: 50 }, pos: { x: 250, y: 50 } },
        { id: 'NextPCAdder', dimensions: { width: 50, height: 50 }, pos: { x: 350, y: 50 } },
        { id: 'ControlUnit', dimensions: { width: 50, height: 50 }, pos: { x: 450, y: 50 } },
        { id: 'RegisterControlUnit', dimensions: { width: 50, height: 50 }, pos: { x: 550, y: 50 } },
        { id: 'SignExtender', dimensions: { width: 50, height: 50 }, pos: { x: 650, y: 50 } },
        { id: 'ShiftLeft', dimensions: { width: 50, height: 50 }, pos: { x: 750, y: 50 } },
        { id: 'BranchAdder', dimensions: { width: 50, height: 50 }, pos: { x: 50, y: 150 } },
        { id: 'ALUSrcMUX', dimensions: { width: 50, height: 50 }, pos: { x: 150, y: 150 } },
        { id: 'ALU', dimensions: { width: 50, height: 50 }, pos: { x: 250, y: 150 } },
        { id: 'ALUControl', dimensions: { width: 50, height: 50 }, pos: { x: 350, y: 150 } },
        { id: 'RegDstMUX', dimensions: { width: 50, height: 50 }, pos: { x: 450, y: 150 } },
        { id: 'BranchAndGate', dimensions: { width: 50, height: 50 }, pos: { x: 550, y: 150 } },
        { id: 'BranchMUX', dimensions: { width: 50, height: 50 }, pos: { x: 650, y: 150 } },
        { id: 'DataMemory', dimensions: { width: 50, height: 50 }, pos: { x: 750, y: 150 } },
        { id: 'MemtoRegMUX', dimensions: { width: 50, height: 50 }, pos: { x: 50, y: 250 } },
    ]
}


export { cpuConfig, cpuLayout };
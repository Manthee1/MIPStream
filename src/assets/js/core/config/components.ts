import { ALUControlPorts, aluPorts, controlUnitPorts, dataMemoryPorts, instructionMemoryPorts, muxesPorts, muxPorts, oneToOnePorts, registerFilePorts, singleOutput, stagePorts, twoToOnePorts } from "./ports";
import { default as _ } from "./cpu-variables";

export const components: ComponentLayout[] = [
    {
        id: "IFtoID",
        label: "IFtoID",
        description: "Pipeline register between Instruction Fetch (IF) and Instruction Decode (ID) stages.",
        type: "stage_register",
        dimensions: { width: 30, height: 500 },
        pos: { x: 290, y: 150 },
        ports: stagePorts.IFtoIDPorts
    },
    {
        id: "IDtoEX",
        label: "IDtoEX",
        description: "Pipeline register between Instruction Decode (ID) and Execute (EX) stages.",
        type: "stage_register",
        dimensions: { width: 30, height: 500 }, pos: { x: 590, y: 150 },
        ports: stagePorts.IDtoEXPorts
    },
    {
        id: "EXtoMEM",
        label: "EXtoMEM",
        description: "Pipeline register between Execute (EX) and Memory Access (MEM) stages.",
        type: "stage_register",
        dimensions: { width: 30, height: 500 }, pos: { x: 880, y: 150 },
        ports: stagePorts.EXtoMEMPorts
    },
    {
        id: "MEMtoWB",
        label: "MEMtoWB",
        description: "Pipeline register between Memory Access (MEM) and Write Back (WB) stages.",
        type: "stage_register",
        dimensions: { width: 30, height: 500 }, pos: { x: 1080, y: 150 },
        ports: stagePorts.MEMtoWBPorts
    },
    {
        id: "PC",
        label: "PC",
        description: "Program Counter (PC) that holds the address of the next instruction to be executed.",
        type: "register",
        dimensions: { width: 50, height: 50 }, pos: { x: 44, y: 345 },
        ports: oneToOnePorts(_.NPC_MEM, _.PC)
    },
    {
        id: "InstructionMemory",
        label: "InstructionMemory",
        description: "Memory unit that stores the instructions to be executed by the CPU.",
        type: "instruction_memory",
        dimensions: { width: 100, height: 150 }, pos: { x: 148, y: 340 },
        ports: instructionMemoryPorts
    },
    {
        id: "Const4",
        label: "Const4",
        description: "Constant value of 4 used for incrementing the Program Counter (PC).",
        type: "const",
        dimensions: { width: 30, height: 30 }, pos: { x: 129, y: 200 },
        ports: singleOutput(4)
    },
    {
        id: "NextPCAdder",
        label: "NextPCAdder",
        description: "Adder that calculates the next Program Counter (PC) value.",
        type: "adder",
        dimensions: { width: 30, height: 50 }, pos: { x: 193, y: 175 },
        ports: twoToOnePorts(_.PC, 4, _.NPC_IF)
    },
    {
        id: "ControlUnit",
        label: "ControlUnit",
        description: "Control unit that generates control signals for the CPU based on the instruction.",
        type: "control_unit",
        dimensions: { width: 50, height: 100 }, pos: { x: 411, y: 149 },
        ports: controlUnitPorts
    },
    {
        id: "RegisterControlUnit",
        label: "RegisterControlUnit",
        description: "Register file that holds the CPU's general-purpose registers.",
        type: "register_unit",
        dimensions: { width: 120, height: 200 }, pos: { x: 428, y: 289 },
        ports: registerFilePorts
    },
    {
        id: "ImmExtend",
        label: "ImmExtend",
        description: "Sign extension unit that extends immediate values to 32 bits.",
        type: "sign_extend",
        dimensions: { width: 50, height: 50 }, pos: { x: 501, y: 525 },
        ports: oneToOnePorts(_.Imm_ID, _.SignedImm_ID)
    },
    {
        id: "ShiftLeft",
        label: "ShiftLeft",
        description: "Shift-left unit that shifts immediate values for branch calculations.",
        type: "shift",
        dimensions: { width: 50, height: 50 }, pos: { x: 701, y: 253 },
        ports: oneToOnePorts(_.SignedImm_EX, _.ShiftedImm_EX)
    },
    {
        id: "BranchAdder",
        label: "BranchAdder",
        description: "Adder that calculates the target address for branch instructions.",
        type: "adder",
        dimensions: { width: 30, height: 50 }, pos: { x: 787, y: 226 },
        ports: twoToOnePorts(_.NPC_EX, _.ShiftedImm_EX, _.TargetPC_EX)
    },
    {
        id: "ALUSrcMUX",
        label: "ALUSrcMUX",
        description: "Multiplexer that selects the second operand for the ALU.",
        type: "mux_reversed",
        dimensions: { width: 25, height: 50 }, pos: { x: 713, y: 386 },
        ports: muxesPorts.ALUSrcMUX
    },
    {
        id: "ALU",
        label: "ALU",
        description: "Arithmetic Logic Unit (ALU) that performs arithmetic and logical operations.",
        type: "alu",
        dimensions: { width: 50, height: 100 }, pos: { x: 776, y: 330 },
        ports: aluPorts
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        description: "Control unit for the ALU that determines the operation to be performed.",
        type: "alu_control",
        dimensions: { width: 50, height: 50 }, pos: { x: 777, y: 484 },
        ports: ALUControlPorts
    },
    {
        id: "RegDstMUX",
        label: "RegDstMUX",
        description: "Multiplexer that selects the destination register for write-back.",
        type: "mux",
        dimensions: { width: 25, height: 50 }, pos: { x: 657, y: 590 },
        ports: muxesPorts.RegDstMUX
    },
    {
        id: "BranchAndGate",
        label: "BranchAndGate",
        description: "AND gate that determines if a branch should be taken.",
        type: "and",
        dimensions: { width: 25, height: 25 }, pos: { x: 967, y: 304 },
        ports: twoToOnePorts(_.Branch_MEM, _.Zero_MEM, _.BranchCond_MEM)
    },
    {
        id: "BranchMUX",
        label: "BranchMUX",
        description: "Multiplexer that selects the next Program Counter (PC) value for branching.",
        type: "mux",
        dimensions: { width: 25, height: 50 }, pos: { x: 960, y: 211 },
        ports: muxesPorts.BranchMUX
    },
    {
        id: "DataMemory",
        label: "DataMemory",
        description: "Memory unit that stores and retrieves data during the Memory Access (MEM) stage.",
        type: "data_memory",
        dimensions: { width: 100, height: 150 }, pos: { x: 951, y: 365 },
        ports: dataMemoryPorts
    },
    {
        id: "MemtoRegMUX",
        label: "MemtoRegMUX",
        description: "Multiplexer that selects the data to be written back to the register file.",
        type: "mux",
        dimensions: { width: 25, height: 50 }, pos: { x: 1143, y: 510 },
        ports: muxesPorts.MemtoRegMUX
    },
]

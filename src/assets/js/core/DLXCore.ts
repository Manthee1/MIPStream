import { ALUopcode, CPU, Memory } from "../interfaces/core"
import { InstructionR, InstructionI, InstructionJ, InstructionType, MemOp } from "../interfaces/instruction"
import INSTRUCTION_SET from "../config/instructionSet"
import { getEffectiveAddressImm, getEffectiveAddressRegister, getRegisterNumber, isEffectiveAddress, isIType, isJType, isRegister, isRType, isValidRegister, isValue, isXBit, } from "../utils"

export default class DLXCore {
    cpu: CPU = {
        intRegisters: Array.from({ length: 32 }, () => 0),
        FPRegisters: Array.from({ length: 32 }, () => 0),
        PC: 0,
        stages: Array.from({ length: 5 }, () => ({
            IR: { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI,
            NPC: 0,
            A: 0,
            B: 0,
            I: 0,
            ALUOutput: 0,
            LMD: 0
        }))
    }

    memory: Memory = {
        data: Array.from({ length: 256 }, () => 0),
        instructions: []
    }

    constructor() {
        this.reset();
    }

    encodeInstruction(instruction: string): InstructionR | InstructionI | InstructionJ {
        const mnemonic = instruction.split(" ")[0];
        const operands = instruction.split(" ").slice(1).join('').split(",").map((operand) => operand.trim());
        // If the instruction NOP, return a NOP instruction
        if (mnemonic === "NOP")
            return { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI;

        const instructionOpcode = INSTRUCTION_SET.findIndex((instructionDef) => instructionDef.mnemonic === mnemonic);

        if (instructionOpcode == -1) throw new Error(`Invalid instruction: ${mnemonic}`);

        const instructionDef = INSTRUCTION_SET[instructionOpcode];

        let encodedInstruction: InstructionR | InstructionI | InstructionJ;


        switch (instructionDef.type) {
            case InstructionType.R:

                if (operands.length !== 3) throw new Error(`Invalid number of operands for instruction ${mnemonic}`);

                // Check if operands are registers
                if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}`);
                if (!isRegister(operands[1])) throw new Error(`Invalid register: ${operands[1]}`);
                if (!isRegister(operands[2])) throw new Error(`Invalid register: ${operands[2]}`);
                const [rs1, rs2, rd] = [getRegisterNumber(operands[1]), getRegisterNumber(operands[2]), getRegisterNumber(operands[0])];
                // Check if registers are valid
                if (!isValidRegister(rs1)) throw new Error(`Invalid register: ${operands[1]}`);
                if (!isValidRegister(rs2)) throw new Error(`Invalid register: ${operands[2]}`);
                if (!isValidRegister(rd)) throw new Error(`Invalid register: ${operands[0]}`);


                encodedInstruction = {
                    opcode: instructionOpcode,
                    rs1: rs1,
                    rs2: rs2,
                    rd: rd
                }

                break;
            case InstructionType.I: {
                let rd: number, rs: number, imm: number;
                if (instructionDef.memOp == MemOp.STORE || instructionDef.memOp == MemOp.LOAD) {
                    if (operands.length !== 2) throw new Error(`Invalid number of operands for instruction ${mnemonic}`);

                    // Check if operands are valid
                    if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}`);
                    if (!isEffectiveAddress(operands[1])) throw new Error(`Invalid effective address: ${operands[1]}`);
                    [rd, rs, imm] = [getRegisterNumber(operands[0]), getEffectiveAddressRegister(operands[1]), getEffectiveAddressImm(operands[1])];
                } else {

                    if (operands.length !== 3) throw new Error(`Invalid number of operands for instruction ${mnemonic}`);


                    // Check if operands are valid
                    if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}`);
                    if (!isRegister(operands[1])) throw new Error(`Invalid register: ${operands[1]}`);
                    if (!isValue(operands[2])) throw new Error(`Invalid immediate value: ${operands[2]}`);
                    imm = parseInt(operands[2]);
                    if (isXBit(imm, 16)) throw new Error(`Immediate value out of range: ${operands[2]}`);
                    [rd, rs] = [getRegisterNumber(operands[0]), getRegisterNumber(operands[1])];
                }

                // Check if registers are valid
                if (!isValidRegister(rd)) throw new Error(`Invalid register: ${operands[0]}`);
                if (!isValidRegister(rs)) throw new Error(`Invalid register: ${operands[1]}`);
                if (isXBit(imm, 16)) throw new Error(`Immediate value out of range: ${operands[1]}`);

                encodedInstruction = {
                    opcode: instructionOpcode,
                    rs: rs,
                    rd: rd,
                    imm: imm
                }
            }

                break;
            case InstructionType.J:

                if (mnemonic === "HALT") return { opcode: instructionOpcode, offset: 0 } as InstructionJ;

                if (operands.length !== 2) throw new Error(`Invalid number of operands for instruction ${mnemonic}`);

                // Check if operands are valid
                if (!isValue(operands[1])) throw new Error(`Invalid offset value: ${operands[1]}`);
                const offset = parseInt(operands[1]);
                if (isXBit(offset, 26)) throw new Error(`Offset value out of range: ${operands[1]}`);

                encodedInstruction = {
                    opcode: instructionOpcode,
                    offset: offset
                }

                break;

            default:
                throw new Error(`Invalid instruction type: ${instructionDef.type}`);
        }
        return encodedInstruction;
    }

    clearMemory() {
        this.memory = {
            data: Array.from({ length: 256 }, () => 0),
            instructions: []
        }
    }

    clearRegisters() {
        this.cpu = {
            intRegisters: Array.from({ length: 32 }, () => 0),
            FPRegisters: Array.from({ length: 32 }, () => 0),
            PC: 0,
            stages: Array.from({ length: 5 }, () => ({
                IR: { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI,
                NPC: 0,
                A: 0,
                B: 0,
                I: 0,
                ALUOutput: 0,
                LMD: 0
            }))
        }
    }


    reset() {
        this.clearMemory();
        this.clearRegisters();

        this.cpu.intRegisters[0] = 0; // Zero register
        this.cpu.intRegisters[29] = 256; // Stack pointer
        this.cpu.intRegisters[30] = 256; // Frame pointer
        this.cpu.intRegisters[31] = 256; // Return addres

        this.cpu.stages[0].NPC = 3;
        this.cpu.stages[1].NPC = 2;
        this.cpu.stages[2].NPC = 1;
        this.cpu.stages[3].NPC = 0;
        this.cpu.stages[4].NPC = 0;
    }


    loadProgram(program: Array<string>) {
        this.reset();
        program.forEach((instruction) => {
            const encodedInstruction = this.encodeInstruction(instruction);

            this.memory.instructions.push(encodedInstruction);
        });
        // Add A HALT and 4 NOP instructions to the end of the program
        this.memory.instructions.push(this.encodeInstruction("HALT"));
        this.memory.instructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        this.memory.instructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        this.memory.instructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        this.memory.instructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);

        console.log('program', this.memory.instructions);

    }

    execAlu(opcode: ALUopcode, in1: number, in2: number) {
        switch (opcode) {
            case ALUopcode.PASSTHROUGH:
                return in1;
            case ALUopcode.ADD:
                return in1 + in2;
            case ALUopcode.SUB:
                return in1 - in2;
            case ALUopcode.MUL:
                return in1 * in2;
            case ALUopcode.DIV:
                return in1 / in2;
            case ALUopcode.INC:
                return in1 + 1;
            case ALUopcode.DEC:
                return in1 - 1;
            case ALUopcode.AND:
                return in1 & in2;
            case ALUopcode.OR:
                return in1 | in2;
            case ALUopcode.XOR:
                return in1 ^ in2;
            case ALUopcode.NOT:
                return ~in1;
            case ALUopcode.LSHIFT:
                return in1 << in2;
            case ALUopcode.RSHIFT:
                return in1 >> in2;
            case ALUopcode.EQ:
                return in1 === in2 ? 1 : 0;
            case ALUopcode.NEQ:
                return in1 !== in2 ? 1 : 0;
            case ALUopcode.GT:
                return in1 > in2 ? 1 : 0;
            case ALUopcode.LT:
                return in1 < in2 ? 1 : 0;
            case ALUopcode.GTE:
                return in1 >= in2 ? 1 : 0;
            case ALUopcode.LTE:
                return in1 <= in2 ? 1 : 0;
        }
    }

    halt() {
        console.log('HALTING');
        this.cpu.PC = 0;
        this.clearRegisters();
    }

    runCycle() {

        // shift stages 
        console.log('Running cycle instruction:', INSTRUCTION_SET[this.cpu.stages[1].IR.opcode]);
        console.log('PC', this.cpu.PC);
        console.log('Registers', this.cpu.intRegisters.join(', '));

        this.writeBack();
        this.memoryAccess();
        this.execute();
        this.decode();
        this.fetch();

        this.cpu.stages.unshift({
            IR: { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI,
            NPC: 0,
            A: 0,
            B: 0,
            I: 0,
            ALUOutput: 0,
            LMD: 0
        });

        this.cpu.stages.pop();
        this.handleForwarding()
    }

    handleForwarding() {
        // Check if this instruction is dependent on on the next instruction
        const EXStage = this.cpu.stages[2]
        const MEMStage = this.cpu.stages[3];
        const WBStage = this.cpu.stages[4];
        const updateEXStage = (rd: number, value: number) => {
            if (isIType(EXStage.IR)) {
                if (rd === EXStage.IR.rs) EXStage.A = value;
                if (rd === EXStage.IR.rd) EXStage.B = value;
            } else if (isRType(EXStage.IR)) {
                if (rd === EXStage.IR.rs1) EXStage.A = value;
                if (rd === EXStage.IR.rs2) EXStage.B = value;
            }
        };

        if (isIType(MEMStage.IR) || isRType(MEMStage.IR)) {
            updateEXStage(MEMStage.IR.rd, MEMStage.ALUOutput);
        }
        if (isIType(WBStage.IR) || isRType(WBStage.IR)) {
            updateEXStage(WBStage.IR.rd, WBStage.ALUOutput);
        }

    }

    writeBack() {
        const WBStage = this.cpu.stages[4];
        console.log('WB', WBStage, INSTRUCTION_SET[WBStage.IR.opcode].mnemonic);
        if (WBStage.IR.opcode === 0) return; // Skip if NOP
        if (INSTRUCTION_SET[WBStage.IR.opcode].memOp === MemOp.STORE) return
        if (isRType(WBStage.IR) || isIType(WBStage.IR)) {
            this.cpu.intRegisters[WBStage.IR.rd] = WBStage.LMD;
        }
    }

    memoryAccess() {
        const MEMStage = this.cpu.stages[3];
        const MEMInstructionDef = INSTRUCTION_SET[MEMStage.IR.opcode];
        console.log('ME', MEMStage, INSTRUCTION_SET[MEMStage.IR.opcode].mnemonic);
        if (MEMInstructionDef.mnemonic === "HALT") {
            this.halt();
            return;
        }

        // If the instruction is a load or store instruction
        if (MEMInstructionDef.memOp === MemOp.LOAD) {
            MEMStage.LMD = this.memory.data[MEMStage.ALUOutput];
        } else if (MEMInstructionDef.memOp === MemOp.STORE) {
            this.memory.data[MEMStage.ALUOutput] = MEMStage.B;
        } else {
            MEMStage.LMD = MEMStage.ALUOutput;
        }


        this.cpu.PC = MEMStage.NPC;
        if (MEMStage.IR.opcode === 0) return; // Skip if NOP

    }

    execute() {
        const EXStage = this.cpu.stages[2];
        console.log('EX', EXStage, INSTRUCTION_SET[EXStage.IR.opcode].mnemonic);
        if (EXStage.IR.opcode === 0) return; // Skip if NOP
        const EXInstructionDef = INSTRUCTION_SET[EXStage.IR.opcode];



        let in1: number = EXStage.A;
        let in2: number = EXStage.B;
        if (isIType(EXStage.IR)) {
            in2 = EXStage.I;
        }

        EXStage.ALUOutput = this.execAlu(EXInstructionDef.ALUopcode, in1, in2);



    }

    decode() {
        const IDStage = this.cpu.stages[1];
        console.log('ID', IDStage, INSTRUCTION_SET[IDStage.IR.opcode].mnemonic);
        if (IDStage.IR.opcode === 0) return; // Skip if NOP

        if (isRType(IDStage.IR)) {
            IDStage.A = this.cpu.intRegisters[IDStage.IR.rs1];
            IDStage.B = this.cpu.intRegisters[IDStage.IR.rs2];
        } else if (isIType(IDStage.IR)) {
            IDStage.A = this.cpu.intRegisters[IDStage.IR.rs];
            IDStage.B = this.cpu.intRegisters[IDStage.IR.rd];
            IDStage.I = IDStage.IR.imm;
        } else if (isJType(IDStage.IR)) {
            IDStage.A = this.cpu.intRegisters[31];
            IDStage.I = IDStage.IR.offset;
        }
    }

    fetch() {
        const IFStage = this.cpu.stages[0];
        IFStage.IR = this.memory.instructions[this.cpu.PC];
        console.log('IF', IFStage, INSTRUCTION_SET[IFStage.IR.opcode].mnemonic);
        IFStage.NPC = this.cpu.PC + 3;
        if (IFStage.IR.opcode === 0) return; // Skip if NOP
    }
}
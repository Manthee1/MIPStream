import { ALUopcode, CPU, Memory } from "../interfaces/core"
import { InstructionR, InstructionI, InstructionJ, InstructionType, MemOp } from "../interfaces/instruction"
import INSTRUCTION_SET from "../config/instructionSet"
import { createBlankStageData, getEffectiveAddressImm, getEffectiveAddressRegister, getRegisterNumber, isEffectiveAddress, isIType, isJType, isLabel, isRegister, isRType, isValidRegister, isValue, isXBit, } from "../utils"

export default class DLXCore {
    cpu: CPU = {
        intRegisters: Array.from({ length: 32 }, () => 0),
        FPRegisters: Array.from({ length: 32 }, () => 0),
        PC: 0,
        stages: Array.from({ length: 5 }, createBlankStageData)
    }

    memory: Memory = {
        data: Array.from({ length: 256 }, () => 0),
        instructions: []
    }

    constructor() {
        this.reset();
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
            PC: -1,
            stages: Array.from({ length: 5 }, createBlankStageData)
        }
    }


    reset() {
        this.clearMemory();
        this.clearRegisters();

        this.cpu.intRegisters[0] = 0; // Zero register
        this.cpu.intRegisters[29] = 256; // Stack pointer
        this.cpu.intRegisters[30] = 256; // Frame pointer
        this.cpu.intRegisters[31] = 256; // Return addres

        this.cpu.stages[0].OPC = -1;
        this.cpu.stages[1].OPC = -1;
        this.cpu.stages[2].OPC = -1;
        this.cpu.stages[3].OPC = -1;
        this.cpu.stages[4].OPC = -1;
        this.cpu.stages[0].NPC = 3;
        this.cpu.stages[1].NPC = 2;
        this.cpu.stages[2].NPC = 1;
        this.cpu.stages[3].NPC = 0;
        this.cpu.stages[4].NPC = 0;


    }


    loadProgram(instructions: Array<InstructionI | InstructionR | InstructionJ>, data: Array<number>) {

        this.reset();

        this.memory.instructions = instructions;
        this.memory.data = data;
        
        this.cpu.PC = 0;
        this.cpu.stages[0].IR = this.memory.instructions[0];
        this.cpu.stages[0].OPC = 0;   

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
        // this.cpu.PC = 0;
        // this.clearRegisters();
    }

    runCycle() {

        // shift stages 
        console.log('Running cycle instruction:', INSTRUCTION_SET[this.cpu.stages[1].IR.opcode]);
        console.log('PC', this.cpu.PC);
        console.log('Registers', this.cpu.intRegisters.join(', '));


        this.cpu.stages.pop();


        this.cpu.stages.unshift(createBlankStageData());
        this.handleForwarding()

        this.writeBack();
        this.memoryAccess();
        this.execute();
        this.decode();


        this.fetch();

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

        this.cpu.PC = MEMStage.cond ? MEMStage.ALUOutput : MEMStage.NPC;

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
            // FLush the ID, EX and MEM stages and set the PC to the address of the jump instruction
            // this.cpu.stages[1] = createBlankStageData();
            this.cpu.stages[1].NPC = IDStage.IR.address + 2;
            // this.cpu.stages[2] = createBlankStageData();
            this.cpu.stages[2].NPC = IDStage.IR.address + 1;
            // this.cpu.stages[3] = createBlankStageData();

            this.cpu.PC = IDStage.IR.address;
        }
    }

    fetch() {
        const IFStage = this.cpu.stages[0];
        IFStage.IR = this.memory.instructions[this.cpu.PC];
        console.log('IF', IFStage, INSTRUCTION_SET[IFStage.IR.opcode].mnemonic);
        IFStage.NPC = this.cpu.PC + 3;
        IFStage.OPC = this.cpu.PC;
        if (IFStage.IR.opcode === 0) return; // Skip if NOP
    }
}
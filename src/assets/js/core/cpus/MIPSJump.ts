import { baseControlSignals, controlSignalsWithJump } from './../config/controlSignals';
import { clone } from "../../utils";
import { default as _ } from "../config/cpu-variables";
import { instructionConfigWithJump } from "../config/instructions";
import MIPSBase from "../MIPSBase";

export class MIPSJump extends MIPSBase {
    controlSignals = controlSignalsWithJump;
    instructionConfig: InstructionConfig[] = instructionConfigWithJump;


    fetch(): void {
        // Update PC
        this.PC.value = _.NPC_MEM.value;

        // Fetch instruction from memory
        _.IR_IF.value = this.instructionMemory[this.PC.value / 4]; // divide by 4 because we are using a 32 bit array rather then an 8 bit array

        // Increment PC
        this.stageRegisters.IFtoID.NPC.value = _.NPC_IF.value = this.PC.value + 4;
        _.PreNPC_MEM.value = _.BranchCond_MEM.value ? _.TargetPC_MEM.value : _.NPC_IF.value;

        _.NPC_MEM.value = _.Jump_ID.value ? _.JumpAddressShifted.value : _.PreNPC_MEM.value;



    }

    decode(): void {
        super.decode();

        const currStage = this.stageRegisters.IFtoID;
        const instruction = currStage.IR.value;
        const opcode = _.OPCODE_ID.value = instruction >>> 26;
        const instructionConfig = this.instructionConfig.find((config) => (config.opcode & 0b111111) === opcode);
        _.Jump_ID.value = instructionConfig?.controlSignals.Jump ?? 0;

        // Get the jump address
        const jumpAddress = instruction & 0x03FFFFFF;
        _.JumpAddress.value = jumpAddress;
        _.JumpAddressShifted.value = (jumpAddress << 2) | (this.PC.value & 0xF0000000);


    }

}




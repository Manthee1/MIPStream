import { components } from './../config/components';
import { baseControlSignals, controlSignalsWithJump } from './../config/controlSignals';
import { clone } from "../../utils";
import { default as _ } from "../config/cpu-variables";
import { instructionConfigWithJump } from "../config/instructions";
import MIPSBase from "../MIPSBase";
import { controlInputPort, getControlUnitPorts, muxPorts, oneToOnePorts, twoToOnePorts } from '../config/ports';
import { connections } from '../config/connections/jump-connections';


const jumpComponents: ComponentLayout[] = [
    ...components.filter((component) => component.id !== "BranchMUX" && component.id !== "ControlUnit"), // Remove the original BranchMUX{
    {
        id: "JumpShiftLeft",
        label: "JumpShiftLeft",
        description: "Jump address shifted left by 2 bits.",
        type: "shift",
        dimensions: { width: 30, height: 30 }, pos: { x: 360, y: 120 },
        ports: oneToOnePorts(_.JumpAddress, _.JumpAddressShifted)
    },
    {
        id: "JumpMUX",
        label: "JumpMUX",
        description: "Jump MUX",
        type: "mux",
        dimensions: { width: 25, height: 50 }, pos: { x: 1005, y: 196 },
        ports: [
            ...twoToOnePorts(_.JumpAddressShifted, _.PreNPC_MEM, _.NPC_MEM),
            ...controlInputPort(_.Jump_ID, "Jump", 'top'),
        ]
    },
    {
        id: "BranchMUX",
        label: "BranchMUX",
        description: "Branch MUX",
        type: "mux_reversed",
        dimensions: { width: 25, height: 50 }, pos: { x: 950, y: 211 },
        ports: [
            ...twoToOnePorts(_.PreNPC_MEM, _.TargetPC_MEM, _.NPC_MEM),
            ...controlInputPort(_.Branch_MEM, "Bran", 'bottom'),
        ]
    },
    {
        id: "ControlUnit",
        label: "ControlUnit",
        description: "Control unit that generates control signals for the CPU based on the instruction.",
        type: "control_unit",
        dimensions: { width: 50, height: 100 }, pos: { x: 411, y: 140 },
        ports: getControlUnitPorts(controlSignalsWithJump)
    },
];


export class MIPSJump extends MIPSBase {
    controlSignals = controlSignalsWithJump;
    instructionConfig: InstructionConfig[] = instructionConfigWithJump;

    public cpuLayout: CPULayout = {
        width: 1200,
        height: 700,
        components: jumpComponents,
        connections: connections,
    };

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




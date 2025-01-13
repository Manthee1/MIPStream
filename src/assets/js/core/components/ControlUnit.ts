import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

let INSTRUCTION_CONFIG: InstructionConfig[];


export class ControlUnit extends ComponentBase {
    id = 'ControlUnit';
    name = 'Control Unit';
    type = ComponentType.ControlUnit;
    description = 'Generates control signals for the processor';
    controlInputs = [];
    inputs = [{
        bits: 6,
        name: 'Opcode',
    }];

    portsLayout: PortLayout[] = [
        {
            name: 'Opcode',
            location: 'left',
            relPos: 0.5
        }
    ];

    constructor(controlSignals: ControlSignal[], instructionConfig: InstructionConfig[]) {
        super();
        INSTRUCTION_CONFIG = instructionConfig;
        this.outputs = controlSignals;

        const outputCount = Object.keys(controlSignals).length;
        this.portsLayout = controlSignals.map((cs, i) => {
            return <PortLayout>{
                name: cs.name,
                location: 'right',
                relPos: (i + 1) / (outputCount + 1),
            };
        }).concat(this.portsLayout);
    }

    execute(inputs: Array<number>): Array<number> {
        const opcode = inputs[0];

        const instruction = INSTRUCTION_CONFIG.find(instruction => instruction.opcode === opcode);
        if (!instruction) throw new Error(`No instruction found for opcode ${opcode}`);
        const controlSignals = instruction.controlSignals;



        return Object.values(controlSignals);
    }
}
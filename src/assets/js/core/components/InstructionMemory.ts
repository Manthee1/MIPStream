import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class InstructionMemory extends ComponentBase {
    id = 'InstructionMemory';
    name = 'Instruction Memory';
    type = ComponentType.InstructionMemory;
    description = 'Stores the instructions';
    controlInputs = [];
    inputs = [{
        bits: 32,
        name: 'Address',
    }];
    outputs = [{
        bits: 32,
        name: 'Instruction',
    }];
    portsLayout: PortLayout[] = [
        {
            name: 'Address',
            location: 'left',
            relPos: 0.2
        },
        {
            name: 'Instruction',
            location: 'right',
            relPos: 0.2
        }
    ];

    constructor() {
        super();
    }

    public execute(inputs: Array<number>, _controlInputs: Array<number>, read: (value: number) => number): Array<number> {
        return [read(inputs[0])];
    }
}
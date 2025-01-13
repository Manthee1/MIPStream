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

    constructor() {
        super();
    }

    public execute(inputs: Array<number>, _controlInputs: Array<number>, read: (value: number) => number): Array<number> {
        return [read(inputs[0])];
    }
}
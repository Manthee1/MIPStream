import { ComponentBase } from "./ComponentBase";

export class ShiftLeft extends ComponentBase {
    id = 'ShiftLeft';
    name = 'Shift Left';
    type = ComponentType.ShiftLeft;
    description = 'Shifts the input left by 2 bits';
    controlInputs = [];
    inputs = [{
        bits: 32,
        name: 'Input',
    }];
    outputs = [{
        bits: 32,
        name: 'Output',
    }];
    value: number;

    constructor(id: string, value: number = 2) {
        super();
        this.id = id;
        this.value = value;
    }

    public execute(inputs: Array<number>): Array<number> {
        return [inputs[0] << this.value];
    }
}

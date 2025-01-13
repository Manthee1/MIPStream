import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class Adder extends ComponentBase {
    id = 'Adder';
    name = 'Adder';
    type = ComponentType.Gate;
    description = 'Adder';
    controlInputs = [];

    constructor(id: string, inputCount: number, bits: number) {
        super();
        this.id = id;
        this.inputs = Array.from({ length: inputCount }, (_v, k) => ({ bits: bits, name: 'in' + (k + 1) }));
        this.outputs = [{ bits: bits, name: 'out' }];

    }
    public execute(inputs: Array<number>): Array<number> {
        return [(inputs[0] + inputs[1]) | 0];
    }
}

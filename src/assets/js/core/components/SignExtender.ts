import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class SignExtender extends ComponentBase {
    id = 'SignExtender';
    name = 'Sign Extender';
    type = ComponentType.SignExtender;
    description = 'Sign extends the input';
    controlInputs = [];
    inputs = [{
        bits: 16,
        name: 'Input',
    }];
    outputs = [{
        bits: 32,
        name: 'Output',
    }];

    constructor(id: string) {
        super();
        this.id = id;
    }

    execute(inputs: Array<number>) {
        // Javascript numbers are always signed 64bit floats.
        // Bitwise operations convert the number to a 32bit signed integer and then back to a 64bit float.
        return [inputs[0] | 0];
    }
}
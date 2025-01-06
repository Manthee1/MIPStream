import { ComponentBase } from "./ComponentBase";

export class MUX extends ComponentBase {
    name = 'MUX';
    description = 'Multiplexer';
    type = ComponentType.MUX;


    constructor(id: string, controlInput: ControlInput, inputCount: number, bits: number) {
        super();

        // Make sure the inputs have same number of bits
        this.id = id;
        this.controlInputs = [controlInput];
        this.inputs = Array.from({ length: inputCount }, (_v, k) => ({ bits: bits, name: 'in' + k }));
        this.outputs = [{ bits: bits, name: 'out' }];

    }
    public execute(inputs: Array<number>, controlInputs: Array<number>): Array<number> {
        return [inputs[controlInputs[0]]];
    }
}

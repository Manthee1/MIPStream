import { ComponentBase } from "./ComponentBase";

export class PC extends ComponentBase {
    id = 'PC';
    name = 'PC';
    type = ComponentType.PC;
    description = 'Program Counter';
    controlInputs = [];
    inputs = [{ bits: 32, name: 'in' }];
    outputs = [{ bits: 32, name: 'out' }];

    constructor() {
        super();
    }


    public execute(inputs: Array<number>, _controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        write(inputs[0], 0);
        return [read(inputs[0])];
    }
}

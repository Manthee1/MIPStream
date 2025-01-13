import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class Adder extends ComponentBase {
    id = 'Adder';
    name = 'Adder';
    type = ComponentType.Gate;
    description = 'Adder';
    controlInputs = [];


    portsLayout: PortLayout[] = [
        {
            name: 'out',
            location: 'right',
            relPos: 0.5
        }
    ];

    constructor(id: string, inputCount: number, bits: number) {
        super();
        this.id = id;
        this.inputs = Array.from({ length: inputCount }, (_v, k) => ({ bits: bits, name: 'in' + (k + 1) }));
        this.outputs = [{ bits: bits, name: 'out' }];
        this.portsLayout = this.inputs.map((_, i) => {
            return <PortLayout>{
                name: 'in' + (i + 1),
                location: 'left',
                relPos: (i + 1) / (inputCount + 1),
            };
        }).concat(this.portsLayout);
    }
    public execute(inputs: Array<number>): Array<number> {
        return [(inputs[0] + inputs[1]) | 0];
    }
}

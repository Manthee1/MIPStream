import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class MUX extends ComponentBase {
    name = 'MUX';
    description = 'Multiplexer';
    type = ComponentType.MUX;

    portsLayout: PortLayout[] = [
        {
            name: 'Control',
            location: 'left',
            relPos: 0.8
        },
        {
            name: 'out',
            location: 'right',
            relPos: 0.5
        }
    ];

    constructor(id: string, controlInput: ControlInput, inputCount: number, bits: number) {
        super();

        // Make sure the inputs have same number of bits
        this.id = id;
        this.controlInputs = [controlInput];
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
    public execute(inputs: Array<number>, controlInputs: Array<number>): Array<number> {
        return [inputs[controlInputs[0]]];
    }
}

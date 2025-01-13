import { ComponentType, GateType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";
let gateType: GateType = GateType.AND;
export class Gate extends ComponentBase {
    name = 'Gate';
    description = 'Gate';
    controlInputs = [];
    type = ComponentType.Gate;


    constructor(id: string, type: GateType, inputCount: number, bits: number) {
        super();

        this.name = type;

        gateType = type;

        this.id = id;
        this.inputs = Array.from({ length: inputCount }, (_v, k) => ({ bits: bits, name: 'in' + (k + 1) }));
        this.outputs = [{ bits: bits, name: 'out' }];

    }
    public execute(inputs: Array<number>): Array<number> {
        switch (gateType) {
            case GateType.AND: return [inputs.reduce((a, b) => a & b)];
            case GateType.OR: return [inputs.reduce((a, b) => a | b)];
            case GateType.XOR: return [inputs.reduce((a, b) => a ^ b)];
            case GateType.NOT: return [inputs[0] ^ 1];
            case GateType.NAND: return [inputs.reduce((a, b) => a & b) ^ 1];
            case GateType.NOR: return [inputs.reduce((a, b) => a | b) ^ 1];
            case GateType.XNOR: return [inputs.reduce((a, b) => a ^ b) ^ 1];
            default:
                throw new Error('Invalid gate type');
        }
    }
}

import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class StageRegister extends ComponentBase {
    id = 'StageRegister';
    name = 'Stage Register';
    type = ComponentType.StageRegister;
    description = 'Stage Register';
    controlInputs = [];

    constructor(id: string, ports: Array<Port>) {
        super();
        this.id = id;
        this.inputs = ports;
        this.outputs = ports.map((port) => ({ bits: port.bits, name: port.name }));


    }
    public execute(inputs: Array<number>): Array<number> {
        return [...inputs];
    }
}

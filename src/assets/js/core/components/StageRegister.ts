import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class StageRegister extends ComponentBase {
    id = 'StageRegister';
    name = 'Stage Register';
    type = ComponentType.StageRegister;
    description = 'Stage Register';
    controlInputs = [];

    portsLayout: PortLayout[] = [];

    constructor(id: string, ports: Array<Port>) {
        super();
        this.id = id;
        this.inputs = ports;
        this.outputs = ports.map((port) => ({ bits: port.bits, name: port.name }));
        for (let i = 0; i < ports.length; i++) {
            this.portsLayout.push({
                name: ports[i].name,
                location: 'left',
                relPos: (i + 1) / (ports.length + 1),
            });

            this.portsLayout.push({
                name: ports[i].name,
                location: 'right',
                relPos: (i + 1) / (ports.length + 1),
            });
        }


    }
    public execute(inputs: Array<number>): Array<number> {
        return [...inputs];
    }
}

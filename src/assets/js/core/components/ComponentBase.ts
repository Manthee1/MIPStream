import { ComponentType } from "../../types/enums";

export class ComponentBase {
    id: string = 'BaseComponent';
    label: string = ''
    name: string = 'BaseComponent';
    type: ComponentType = ComponentType.Gate;
    description: string = 'BaseComponent';
    controlInputs: ControlInput[] = [];
    inputs: ComponentInput[] = [];
    outputs: ComponentOutput[] = [];

    portsLayout: PortLayout[] = [];


    public execute(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        return [];
    }

}




import { ComponentBase } from "./ComponentBase";

export class COMPONENT extends ComponentBase {
    // id = 'COMPONENT';
    // name = 'COMPONENT';
    // type = ComponentType.COMPONENT;
    // description = 'COMPONENT';
    // controlInputs = [];
    // inputs = [];
    // outputs = [];

    constructor(id: string, name: string, type: ComponentType, description: string, controlInputs: ControlInput[], inputs: ComponentInput[], outputs: ComponentOutput[]) {
        super();

        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.controlInputs = controlInputs;
        this.inputs = inputs;
        this.outputs = outputs;

    }
    public execute(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        return [];
    }
}

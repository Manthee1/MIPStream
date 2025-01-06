import { ComponentBase } from "./ComponentBase";

export class Constant extends ComponentBase {
    name = 'Constant';
    type = ComponentType.Constant;
    description = 'A constant';
    controlInputs = [];
    inputs = [];
    value = 0;

    constructor(id: string, value: number, bits: number) {
        super();

        this.id = id;
        this.outputs = [{ name: 'out', bits: bits }]
        this.value = value
        this.label = value.toString();

    }
    public execute(): Array<number> {
        return [this.value];
    }
}

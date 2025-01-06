export class ComponentBase implements ComponentBaseInterface {
    id: string = 'BaseComponent';
    label: string = ''
    name: string = 'BaseComponent';
    type: ComponentType = ComponentType.Gate;
    description: string = 'BaseComponent';
    controlInputs: ControlInput[] = [];
    inputs: ComponentInput[] = [];
    outputs: ComponentOutput[] = [];


    public execute(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        return [];
    }

}




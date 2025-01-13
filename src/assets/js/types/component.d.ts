// interface ControlInput {
//     bits: number;
//     name: string;
// }

// interface ControlSignal {
//     bits: number;
//     name: string;
// }

// interface ComponentInput {
//     bits: number;
//     name: string;
// }


// interface ComponentOutput {
//     bits: number;
//     name: string;
// }

type ControlInput = Port
type ControlSignal = Port
type ComponentInput = Port
type ComponentOutput = Port



interface ComponentConnection {
    bitRange: [number, number];
    // from and to format: componentId.portName 
    from: string;
    to: string;
}



interface ComponentBaseInterface {
    id: string;
    name: string;
    type: ComponentType;
    description: string;
    controlInputs: ControlInput[];
    inputs: ComponentInput[];
    outputs: ComponentOutput[];
}


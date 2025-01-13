import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

export class DataMemory extends ComponentBase {
    id = 'DataMemory';
    name = 'Data Memory';
    type = ComponentType.DataMemory;
    description = 'Stores the data';
    controlInputs = [
        {
            bits: 1,
            name: "MemWrite",
        }, {
            bits: 1,
            name: "MemRead",
        }
    ];
    inputs = [{
        bits: 32,
        name: 'Address',
    }, {
        bits: 32,
        name: 'WriteData',
    },];
    outputs = [{
        bits: 32,
        name: 'ReadData',
    }];

    portsLayout: PortLayout[] = [
        {
            name: 'MemWrite',
            location: 'top',
            relPos: 0.5
        },
        {
            name: 'MemRead',
            location: 'bottom',
            relPos: 0.5
        },
        {
            name: 'Address',
            location: 'left',
            relPos: 0.1
        },
        {
            name: 'WriteData',
            location: 'left',
            relPos: 0.9
        },
        {
            name: 'ReadData',
            location: 'right',
            relPos: 0.9
        }
    ];

    constructor() {
        super();
    }

    public execute(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        const MemWrite = controlInputs[0];
        const MemRead = controlInputs[1]

        if (MemWrite) {
            write(inputs[1], inputs[0])
            return [0];
        }

        if (MemRead)
            return [read(inputs[0])]

        return [0];
    }
}
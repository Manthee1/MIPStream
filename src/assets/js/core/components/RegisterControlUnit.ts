import { ComponentBase } from "./ComponentBase";

export class RegisterControlUnit extends ComponentBase {
    id = 'RegisterControlUnit';
    name = 'Register Control Unit';
    type = ComponentType.RegisterFile;
    description = 'Reads and writes data to the register file';
    controlInputs = [
        {
            bits: 1,
            name: 'RegWrite',
        }
    ];
    inputs = [{
        bits: 5,
        name: 'ReadRegister1',
    }, {
        bits: 5,
        name: 'ReadRegister2',
    }, {
        bits: 5,
        name: 'WriteRegister',
    }, {
        bits: 32,
        name: 'WriteData',
    }];
    outputs = [{
        bits: 32,
        name: 'ReadData1',
    }, {
        bits: 32,
        name: 'ReadData2',
    }];

    constructor() {
        super();
    }

    execute = (inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void) => {
        if (controlInputs[0] === 1) {
            write(inputs[3], inputs[2]);
            return [0, 0];
        }
        return [read(inputs[0]), read(inputs[1])];
    }
}
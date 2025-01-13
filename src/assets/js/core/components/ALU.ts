import { ComponentType } from "../../types/enums";
import { ComponentBase } from "./ComponentBase";

const ALUOperations = {
    ADD: 0b0000,
    SUB: 0b0001,
    AND: 0b0010,
    OR: 0b0011,
    XOR: 0b0100,
    SLL: 0b0101,
    SRL: 0b0110,
    SRA: 0b0111,
    SLT: 0b1000,
    SLTU: 0b1001,
    MUL: 0b1010,
    DIV: 0b1011,
    MFHI: 0b1100,
    MFLO: 0b1101
};

export class ALU extends ComponentBase {
    id = 'ALU';
    name = 'Arithmetic Logic Unit';
    type = ComponentType.ALU;
    description = 'Performs arithmetic and logic operations';
    controlInputs = [
        {
            bits: 4,
            name: 'Operation',
        }
    ];
    inputs = [{
        bits: 32,
        name: 'A',
    }, {
        bits: 32,
        name: 'B',
    }];
    outputs = [{
        bits: 32,
        name: 'Result',
    }, {
        bits: 1,
        name: 'Zero',
    }
    ];

    portsLayout: PortLayout[] = [
        {
            name: 'Operation',
            location: 'bottom',
            relPos: 0.5
        },
        {
            name: 'A',
            location: 'left',
            relPos: 0.2
        },
        {
            name: 'B',
            location: 'left',
            relPos: 0.8
        },
        {
            name: 'Result',
            location: 'right',
            relPos: 0.5
        },
        {
            name: 'Zero',
            location: 'right',
            relPos: 0.4
        }
    ];

    constructor() {
        super();
    }

    executeALU(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void) {
        const operation = controlInputs[0];
        let value = 0;
        let zero = 0;
        let HI = read(0);
        let LO = read(1);


        switch (operation) {
            case ALUOperations.ADD: value = inputs[0] + inputs[1]; break;
            case ALUOperations.SUB: value = inputs[0] - inputs[1]; break;
            case ALUOperations.AND: value = inputs[0] & inputs[1]; break;
            case ALUOperations.OR: value = inputs[0] | inputs[1]; break;
            case ALUOperations.XOR: value = inputs[0] ^ inputs[1]; break;
            case ALUOperations.SLL: value = inputs[0] << inputs[1]; break;
            case ALUOperations.SRL: value = inputs[0] >>> inputs[1]; break;
            case ALUOperations.SRA: value = inputs[0] >> inputs[1]; break;
            case ALUOperations.SLT: value = inputs[0] < inputs[1] ? 1 : 0; break;
            case ALUOperations.SLTU: value = (inputs[0] >>> 0) < (inputs[1] >>> 0) ? 1 : 0; break;
            case ALUOperations.MUL:
                const result = BigInt(inputs[0]) * BigInt(inputs[1]);
                HI = Number(result >> 32n); // High 32 bits
                LO = Number(result & 0xFFFFFFFFn); // Low 32 bits
                value = LO; // For simplicity, returning the low part
                break;
            case ALUOperations.DIV:
                if (inputs[1] !== 0) {
                    LO = Math.floor(inputs[0] / inputs[1]);
                    HI = inputs[0] % inputs[1];
                    value = LO; // For simplicity, returning the low part
                } else {
                    throw new Error("Division by zero");
                }
                break;
            case ALUOperations.MFHI: value = HI; break;
            case ALUOperations.MFLO: value = LO; break;
            default: throw new Error("Unknown ALU operation");
        }

        if (value === 0) zero = 1;


        return [(value | 0), zero];
    }
}
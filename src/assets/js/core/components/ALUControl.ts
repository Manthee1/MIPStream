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

export class ALUControl extends ComponentBase {
    id = 'ALUControl';
    name = 'ALU Control';
    type = ComponentType.ALUControl;
    description = 'Generates the ALU control signals';
    controlInputs = [{
        bits: 2,
        name: 'Opcode',
    }];
    inputs = [{
        bits: 6,
        name: 'Funct',
    }];
    outputs = [{
        bits: 4,
        name: 'Operation',
    }];

    portsLayout: PortLayout[] = [
        {
            name: 'Opcode',
            location: 'right',
            relPos: 0.5
        },
        {
            name: 'Funct',
            location: 'top',
            relPos: 0.5
        },
        {
            name: 'Operation',
            location: 'left',
            relPos: 0.5
        }
    ];

    constructor() {
        super();
    }

    public execute(inputs: Array<number>, controlInputs: Array<number>, read: (value: number) => number, write: (value: number, address: number) => void): Array<number> {
        const ALUOP = controlInputs[0] & 0b11
        // const ALUOP0 = controlInputs[0] & 0b01
        // const ALUOP1 = controlInputs[0] & 0b10

        // const f0 = !!(inputs[0] & 0b000001)
        // const f1 = !!(inputs[0] & 0b000010)
        // const f2 = !!(inputs[0] & 0b000100)
        // const f3 = !!(inputs[0] & 0b001000)
        const func = inputs[0] & 0b001111


        let operation: number = 0;

        switch (ALUOP) {
            case 0b00:
                operation = ALUOperations.ADD;

                break;
            case 0b01:
                operation = ALUOperations.SUB;

                break;
            case 0b10:
                // Map the funct field to the ALU operation
                operation = func;
                break;

            default:
                throw new Error("Unknown ALU operation");
                break;
        }
        return [operation];


        // const op0 = ALUOP1 && !ALUOP0 && (f3 || (!f1 && f0))
        // const op1 = !ALUOP1 || ALUOP0 || !f2
        // const op2 = (!ALUOP1 && ALUOP0) || (ALUOP1 && !ALUOP0 && f1)
        // const op3 = ALUOP1 && !ALUOP0 && f1 && f0
        // return [op0, op1, op2, op3];
    }
}
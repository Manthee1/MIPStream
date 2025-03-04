import { clone } from "../../utils"
import { controlSignals } from "./controlSignals"

export const singleInput: Array<PortLayout> = [
    {
        id: "in",
        label: "in",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
]

export const singleOutput: Array<PortLayout> = [
    {
        id: "out",
        label: "out",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
]


export const doubleInput: Array<PortLayout> = [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
]

export const oneToOnePorts: Array<PortLayout> = [
    ...clone(singleInput),
    ...clone(singleOutput),
]

export const twoToOnePorts: Array<PortLayout> = [
    ...clone(doubleInput),
    ...clone(singleOutput),
]

export const muxPorts: Array<PortLayout> = [
    ...clone(doubleInput),
    ...clone(singleOutput),
    {
        id: "select",
        label: "select",
        type: 'input',
        location: 'top',
        bits: 1,
        value: 0,
        relPos: 0.5,
    },
]

const controlInput: PortLayout = {
    id: "control",
    label: "control",
    type: 'input',
    location: 'top',
    bits: 1,
    value: 0,
    relPos: 0.5,
}


export const muxesPorts: { [key: string]: Array<PortLayout> } = {};

const muxControlSignals = ['ALUSrc', 'MemtoReg', 'Branch', 'RegDst'];

for (let i = 0; i < muxControlSignals.length; i++) {
    const cs = muxControlSignals[i];
    muxesPorts[cs + 'MUX'] = [
        ...clone(doubleInput),
        ...clone(singleOutput),
        {
            ...clone(controlInput),
            label: cs,
        },
    ];
}




export const instructionMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "instruction",
        label: "instruction",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
]

export const controlUnitPorts: Array<PortLayout> = [
    {
        id: "opcode",
        label: "opcode",
        type: 'input',
        location: 'left',
        bits: 6,
        value: 0,
        relPos: 0.5,
    },
]

export let controlSignalPorts: { [value: string]: PortLayout } = {};
const controlSignalsValues = Object.values(controlSignals);

for (let i = 0; i < controlSignalsValues.length; i++) {
    const controlSignal = controlSignalsValues[i];

    controlSignalPorts[controlSignal.name] =
    {
        id: controlSignal.name,
        label: controlSignal.name,
        type: 'input',
        location: 'left',
        bits: controlSignal.bits,
        value: 0,
        relPos: 0.02 + i * 0.02
    };

    controlUnitPorts.push({
        id: controlSignal.name,
        label: controlSignal.name,
        type: 'output',
        location: 'right',
        bits: controlSignal.bits,
        value: 0,
        relPos: (i + 1) / (controlSignalsValues.length + 1),
    });

}

export const registerFilePorts: Array<PortLayout> = [
    {
        id: "reg1",
        label: "Read Reg 1",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "reg2",
        label: "Read Reg 2",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.4,
    },
    {
        id: "write",
        label: "write",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.6,
    },
    {
        id: "data",
        label: "data",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
    {
        id: "reg1Data",
        label: "Reg1Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.4,
    },
    {
        id: "reg2Data",
        label: "Reg2Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.6,
    },
    {
        ...clone(controlSignalPorts["RegWrite"]),
        relPos: 0.5,
        location: 'top',
    },
];


export const aluPorts: Array<PortLayout> = [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
    {
        id: "ALUOut",
        label: "ALUOut",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "zero",
        label: "Zero",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.45,
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        type: 'input',
        location: 'bottom',
        bits: 4,
        value: 0,
        relPos: 0.5,
    },
];


export const ALUControlPorts: Array<PortLayout> = [
    {
        id: "ALUOp",
        label: "ALUOp",
        type: 'input',
        location: 'right',
        bits: 2,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "funct",
        label: "funct",
        type: 'input',
        location: 'left',
        bits: 6,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        type: 'output',
        location: 'top',
        bits: 4,
        value: 0,
        relPos: 0.5,
    },
];

export const dataMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.1,
    },
    {
        id: "writeData",
        label: "writeData",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.4,
    },
    {
        id: "readData",
        label: "readData",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.8,
    },
    {
        ...clone(controlSignalPorts["MemWrite"]),
        relPos: 0.2,
        location: 'top',
    },
    {
        ...clone(controlSignalPorts["MemRead"]),
        relPos: 0.8,
        location: 'top',
    },

];


export const stagePorts: { [key: string]: Array<PortLayout> } = {
    IFtoIDPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.44,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.23,
        },

    ],
    IDtoEXPorts: [
        clone(controlSignalPorts["RegWrite"]),
        clone(controlSignalPorts["MemtoReg"]),
        clone(controlSignalPorts["MemWrite"]),
        clone(controlSignalPorts["MemRead"]),
        clone(controlSignalPorts["Branch"]),
        clone(controlSignalPorts["ALUOp"]),
        clone(controlSignalPorts["ALUSrc"]),
        clone(controlSignalPorts["RegDst"]),

        // {
        //     id: "instruction",
        //     label: "instruction",
        //     type: 'input',
        //     location: 'left',
        //     bits: 32,
        //     value: 0,
        //     relPos: 0.33,
        // },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.23,
        },
        {
            id: "reg1Data",
            label: "Reg1Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.4,
        },
        {
            id: "reg2Data",
            label: "Reg2Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.5,
        },
        {
            id: "imm",
            label: "Immidiate",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.8,
        },
        {
            id: "Rd",
            label: "Rd",
            type: 'input',
            location: 'left',
            bits: 5,
            value: 0,
            relPos: 0.9,
        },
        {
            id: "Rt",
            label: "Rt",
            type: 'input',
            location: 'left',
            bits: 5,
            value: 0,
            relPos: 0.95,
        }


    ],
    EXtoMEMPorts: [
        clone(controlSignalPorts["RegWrite"]),
        clone(controlSignalPorts["MemtoReg"]),
        clone(controlSignalPorts["MemWrite"]),
        clone(controlSignalPorts["MemRead"]),
        clone(controlSignalPorts["Branch"]),
        // {
        //     id: "instruction",
        //     label: "instruction",
        //     type: 'input',
        //     location: 'left',
        //     bits: 32,
        //     value: 0,
        //     relPos: 0.33,
        // },
        {
            id: "targetPC",
            label: "Target PC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
        {
            id: "zero",
            label: "Zero",
            type: 'input',
            location: 'left',
            bits: 1,
            value: 0,
            relPos: 0.38,
        },
        {
            id: "ALUResult",
            label: "ALUResult",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.4,
        },
        {
            id: "reg2Data",
            label: "Reg2Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.555,
        },
        {
            id: "Rt",
            label: "Rt",
            type: 'input',
            location: 'left',
            bits: 5,
            value: 0,
            relPos: 0.95,
        }
    ],
    MEMtoWBPorts: [
        clone(controlSignalPorts["RegWrite"]),
        clone(controlSignalPorts["MemtoReg"]),
        {
            id: "ReadData",
            label: "ReadData",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.74,

        },
        {
            id: "ALUResult",
            label: "ALUResult",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.8,
        },
        {
            id: "Rt",
            label: "Rt",
            type: 'input',
            location: 'left',
            bits: 5,
            value: 0,
            relPos: 0.95,
        }
    ],
}


Object.values(stagePorts).forEach(ports => {
    console.log(ports);

    const mirroredPorts = []
    for (let port of ports) {
        const mirroredPort = clone(port);

        port.id = `${port.id}In`;
        port.location = 'left';
        port.type = 'input';

        mirroredPort.location = 'right';
        mirroredPort.id = `${port.id}Out`;
        mirroredPort.type = 'output';
        mirroredPorts.push(mirroredPort);
    }
    ports.push(...mirroredPorts);
});




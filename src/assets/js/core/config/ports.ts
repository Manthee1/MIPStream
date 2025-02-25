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


export const instructionMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "instruction",
        label: "instruction",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.5,
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

const controlSignalsAmount = Object.keys(controlSignals).length;
for (let controlSignalIndex in Object.values(controlSignals)) {
    const controlSignal = Object.values(controlSignals)[controlSignalIndex];
    controlUnitPorts.push({
        id: controlSignal.name,
        label: controlSignal.name,
        type: 'output',
        location: 'right',
        bits: controlSignal.bits,
        value: 0,
        relPos: (parseInt(controlSignalIndex) + 1) / (controlSignalsAmount + 1),
    });
}


export const registerFilePorts: Array<PortLayout> = [
    {
        id: "read1",
        label: "read1",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "read2",
        label: "read2",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.8,
    },
    {
        id: "write",
        label: "write",
        type: 'input',
        location: 'left',
        bits: 5,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "data",
        label: "data",
        type: 'input',
        location: 'left',
        bits: 32,
        value: 0,
        relPos: 0.5,
    },
    {
        id: "read1Data",
        label: "read1Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.2,
    },
    {
        id: "read2Data",
        label: "read2Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: 0,
        relPos: 0.8,
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
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },

    ],
    IDtoEXPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
    ],
    EXtoMEMPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
    ],
    MEMtoWBPorts: [
        {
            id: "instruction",
            label: "instruction",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.33,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: 0,
            relPos: 0.2,
        },
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




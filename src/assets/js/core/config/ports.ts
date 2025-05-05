import { clone } from "../../utils"
import { baseControlSignals } from "./controlSignals"
import _ from "./cpu-variables"

export const singleInput = (value: number | Ref<number>): Array<PortLayout> => [
    {
        id: "in",
        label: "in",
        type: 'input',
        location: 'left',
        bits: 32,
        value: value,
        relPos: 0.5,
    },
]

export const singleOutput = (value: number | Ref<number>): Array<PortLayout> => [
    {
        id: "out",
        label: "out",
        type: 'output',
        location: 'right',
        bits: 32,
        value: value,
        relPos: 0.5,
    },
]


export const doubleInput = (value1: number | Ref<number>, value2: number | Ref<number>): Array<PortLayout> => [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: value1,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: value2,
        relPos: 0.8,
    },
]

export const oneToOnePorts = (valueIn: number | Ref<number>, valueOut: number | Ref<number>): Array<PortLayout> => [
    ...singleInput(valueIn),
    ...singleOutput(valueOut),
]

export const twoToOnePorts = (valueIn1: number | Ref<number>, valueIn2: number | Ref<number>, valueOut: number | Ref<number>): Array<PortLayout> => [
    ...doubleInput(valueIn1, valueIn2),
    ...singleOutput(valueOut),
]

export const muxPorts = (valueIn1: number | Ref<number>, valueIn2: number | Ref<number>, valueOut: number | Ref<number>, valueControl: number | Ref<number>): Array<PortLayout> => [
    ...twoToOnePorts(valueIn1, valueIn2, valueOut),
    {
        id: "select",
        label: "select",
        type: 'input',
        location: 'top',
        bits: 1,
        value: valueControl,
        relPos: 0.5,
    },
]

export const controlInputPort = (value: number | Ref<number>, label: string, location: 'top' | 'bottom' = 'top'): PortLayout[] => [{
    id: "control",
    label: label,
    type: 'input',
    location: location,
    bits: 1,
    value: value,
    relPos: 0.5,
}]



const muxControlSignals = ['ALUSrc', 'MemtoReg', 'Branch', 'RegDst'];

export const muxesPorts = {
    ALUSrcMUX: [
        ...twoToOnePorts(_.Reg2Data_EX, _.SignedImm_EX, _.ALUIn2_EX),
        ...controlInputPort(_.ALUSrc_EX, "ALUSrc"),
    ],
    MemtoRegMUX: [
        ...twoToOnePorts(_.MemReadResult_WB, _.ALUResult_WB, _.WriteRegisterData_WB),
        ...controlInputPort(_.MemtoReg_MEM, "MemtoReg"),
    ],
    BranchMUX: [
        ...twoToOnePorts(_.NPC_IF, _.TargetPC_MEM, _.NPC_MEM),
        ...controlInputPort(_.Branch_MEM, "Branch", 'bottom'),
    ],
    RegDstMUX: [
        ...twoToOnePorts(_.Rt_EX, _.Rd_EX, _.WriteRegister_EX),
        ...controlInputPort(_.RegDst_EX, "RegDst"),
    ],
}




export const instructionMemoryPorts: Array<PortLayout> = [
    {
        id: "address",
        label: "address",
        type: 'input',
        location: 'left',
        bits: 32,
        value: _.PC,
        relPos: 0.2,
    },
    {
        id: "instruction",
        label: "instruction",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.IR_IF,
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
        value: _.OPCODE_ID,
        relPos: 0.5,
    },
]

export let controlSignalPorts: { [value: string]: PortLayout } = {};
const controlSignalsValues = Object.values(baseControlSignals);

for (let i = 0; i < controlSignalsValues.length; i++) {
    const controlSignal = controlSignalsValues[i];

    controlSignalPorts[controlSignal.name] =
    {
        id: controlSignal.name,
        label: controlSignal.name,
        type: 'input',
        location: 'left',
        bits: controlSignal.bits,
        value: _[controlSignal.name + '_ID'],
        relPos: 0.02 + i * 0.02
    };

    controlUnitPorts.push({
        id: controlSignal.name,
        label: controlSignal.name,
        type: 'output',
        location: 'right',
        bits: controlSignal.bits,
        value: _[controlSignal.name + '_ID'],
        relPos: (i + 1) / (controlSignalsValues.length + 2),
    });

}


export const getControlUnitPorts = (controlSignals: Record<string, ControlSignal>): Array<PortLayout> => {
    const ports: Array<PortLayout> = [
        {
            id: "opcode",
            label: "opcode",
            type: 'input',
            location: 'left',
            bits: 6,
            value: _.OPCODE_ID,
            relPos: 0.5,
        }
    ];
    const controlSignalsValues = Object.values(controlSignals);
    for (let i = 0; i < controlSignalsValues.length; i++) {
        const controlSignal = controlSignalsValues[i];
        ports.push({
            id: controlSignal.name,
            label: controlSignal.name,
            type: 'output',
            location: 'right',
            bits: controlSignal.bits,
            value: _[controlSignal.name + '_ID'],
            relPos: (i + 1) / (controlSignalsValues.length + 1),
        });
    }
    return ports;

}

export const registerFilePorts: Array<PortLayout> = [
    {
        id: "reg1",
        label: "Read Reg 1",
        type: 'input',
        location: 'left',
        bits: 5,
        value: _.Rs_ID,
        relPos: 0.2,
    },
    {
        id: "reg2",
        label: "Read Reg 2",
        type: 'input',
        location: 'left',
        bits: 5,
        value: _.Rt_ID,
        relPos: 0.4,
    },
    {
        id: "write",
        label: "write",
        type: 'input',
        location: 'left',
        bits: 5,
        value: _.WriteRegister_WB,
        relPos: 0.6,
    },
    {
        id: "data",
        label: "data",
        type: 'input',
        location: 'left',
        bits: 32,
        value: _.WriteRegisterData_WB,
        relPos: 0.8,
    },
    {
        id: "reg1Data",
        label: "Reg1Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.Reg1Data_ID,
        relPos: 0.4,
    },
    {
        id: "reg2Data",
        label: "Reg2Data",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.Reg2Data_ID,
        relPos: 0.6,
    },
    {
        ...clone(controlSignalPorts["RegWrite"]),
        relPos: 0.5,
        location: 'top',
        value: _.RegWrite_WB
    },
];


export const aluPorts: Array<PortLayout> = [
    {
        id: "in1",
        label: "in1",
        type: 'input',
        location: 'left',
        bits: 32,
        value: _.ALUIn1_EX,
        relPos: 0.2,
    },
    {
        id: "in2",
        label: "in2",
        type: 'input',
        location: 'left',
        bits: 32,
        value: _.ALUIn2_EX,
        relPos: 0.8,
    },
    {
        id: "ALUOut",
        label: "ALUResult",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.ALUResult_EX,
        relPos: 0.5,
    },
    {
        id: "zero",
        label: "Zero",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.Zero_EX,
        relPos: 0.38,
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        type: 'input',
        location: 'bottom',
        bits: 4,
        value: _.ALUCONTROL_EX,
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
        value: _.ALUOp_EX,
        relPos: 0.5,
    },
    {
        id: "funct",
        label: "funct",
        type: 'input',
        location: 'left',
        bits: 6,
        value: _.funct_EX,
        relPos: 0.5,
    },
    {
        id: "ALUControl",
        label: "ALUControl",
        type: 'output',
        location: 'top',
        bits: 4,
        value: _.ALUCONTROL_EX,
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
        value: _.ALUResult_MEM,
        relPos: 0.1,
    },
    {
        id: "writeData",
        label: "writeData",
        type: 'input',
        location: 'left',
        bits: 32,
        value: _.Reg2Data_MEM,
        relPos: 0.63,
    },
    {
        id: "readData",
        label: "readData",
        type: 'output',
        location: 'right',
        bits: 32,
        value: _.MemReadResult_MEM,
        relPos: 0.8,
    },
    {
        ...clone(controlSignalPorts["MemWrite"]),
        relPos: 0.2,
        location: 'top',
        value: _.MemWrite_MEM
    },
    {
        ...clone(controlSignalPorts["MemRead"]),
        relPos: 0.8,
        location: 'top',
        value: _.MemReadResult_MEM
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
            value: _.IR_IF,
            relPos: 0.44,
        },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.NPC_IF,
            relPos: 0.23,
        },

    ],
    IDtoEXPorts: [
        { ...clone(controlSignalPorts["RegWrite"]), value: _.RegWrite_ID },
        { ...clone(controlSignalPorts["MemtoReg"]), value: _.MemtoReg_ID },
        { ...clone(controlSignalPorts["MemWrite"]), value: _.MemWrite_ID },
        { ...clone(controlSignalPorts["MemRead"]), value: _.MemRead_ID },
        { ...clone(controlSignalPorts["Branch"]), value: _.Branch_ID },
        { ...clone(controlSignalPorts["ALUOp"]), value: _.ALUOp_ID },
        { ...clone(controlSignalPorts["ALUSrc"]), value: _.ALUSrc_ID },
        { ...clone(controlSignalPorts["RegDst"]), value: _.RegDst_ID },

        // {
        //     id: "instruction",
        //     label: "instruction",
        //     type: 'input',
        //     location: 'left',
        //     bits: 32,
        //     value: _.IR_IF,
        //     relPos: 0.33,
        // },
        {
            id: "PC",
            label: "NextPC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.NPC_ID,
            relPos: 0.23,
        },
        {
            id: "reg1Data",
            label: "Reg1Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.Reg1Data_ID,
            relPos: 0.4,
        },
        {
            id: "reg2Data",
            label: "Reg2Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.Reg2Data_ID,
            relPos: 0.619,
        },
        {
            id: "imm",
            label: "Immidiate",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.SignedImm_ID,
            relPos: 0.8,
        },
        {
            id: "Rd",
            label: "Rd",
            type: 'input',
            location: 'left',
            bits: 5,
            value: _.Rd_ID,
            relPos: 0.96,
        },
        {
            id: "Rt",
            label: "Rt",
            type: 'input',
            location: 'left',
            bits: 5,
            value: _.Rt_ID,
            relPos: 0.9,
        }


    ],
    EXtoMEMPorts: [
        { ...clone(controlSignalPorts["RegWrite"]), value: _.RegWrite_EX },
        { ...clone(controlSignalPorts["MemtoReg"]), value: _.MemtoReg_EX },
        { ...clone(controlSignalPorts["MemWrite"]), value: _.MemWrite_EX },
        { ...clone(controlSignalPorts["MemRead"]), value: _.MemRead_EX },
        { ...clone(controlSignalPorts["Branch"]), value: _.Branch_EX },
        // {
        //     id: "instruction",
        //     label: "instruction",
        //     type: 'input',
        //     location: 'left',
        //     bits: 32,
        //     value: _.IR_IF,
        //     relPos: 0.33,
        // },
        {
            id: "targetPC",
            label: "Target PC",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.TargetPC_EX,
            relPos: 0.202,
        },
        {
            id: "zero",
            label: "Zero",
            type: 'input',
            location: 'left',
            bits: 1,
            value: _.Zero_EX,
            relPos: 0.436,
        },
        {
            id: "ALUResult",
            label: "ALUResult",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.ALUResult_EX,
            relPos: 0.46,
        },
        {
            id: "reg2Data",
            label: "Reg2Data",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.Reg2Data_EX,
            relPos: 0.619,
        },
        {
            id: "Rt",
            label: "WriteRegister",
            type: 'input',
            location: 'left',
            bits: 5,
            value: _.WriteRegister_EX,
            relPos: 0.93,
        }
    ],
    MEMtoWBPorts: [
        { ...clone(controlSignalPorts["RegWrite"]), value: _.RegWrite_MEM },
        { ...clone(controlSignalPorts["MemtoReg"]), value: _.MemtoReg_MEM },
        {
            id: "ReadData",
            label: "ReadData",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.MemReadResult_MEM,
            relPos: 0.74,

        },
        {
            id: "ALUResult",
            label: "ALUResult",
            type: 'input',
            location: 'left',
            bits: 32,
            value: _.ALUResult_MEM,
            relPos: 0.8,
        },
        {
            id: "Rt",
            label: "Rt",
            type: 'input',
            location: 'left',
            bits: 5,
            value: _.WriteRegister_MEM,
            relPos: 0.93,
        }
    ],
}

const stageNames = ["ID", "EX", "MEM", "WB"];

Object.values(stagePorts).forEach(ports => {
    console.log(ports);
    const stageName = stageNames.shift();

    const mirroredPorts = []
    for (let port of ports) {
        const mirroredPort = clone(port);

        port.id = `${port.id}In`;
        port.location = 'left';
        port.type = 'input';

        mirroredPort.location = 'right';
        mirroredPort.id = `${port.id}Out`;
        mirroredPort.type = 'output';
        // mirroredPort.value = 
        if (typeof mirroredPort.value == 'object') {
            const mirrorValKey = mirroredPort.value.key.split('_').slice(0, -1).join('_') + '_' + stageName;
            mirroredPort.value = _[mirrorValKey];
        }
        mirroredPorts.push(mirroredPort);
    }
    ports.push(...mirroredPorts);
});



console.log(stagePorts);

import { IOrderQuery, ITable, IWhereQuery } from "jsstore";
import db from "../db/database";

export type Instruction = InstructionConfig & { id: number, cpuType: string };


export const defaultInstructionSettings: Record<string, any> = {};

async function getInstructionById(id: number) {
    return (await db.select({
        from: 'instructions',
        where: {
            id: id
        }
    }))[0] as Instruction | undefined;
}

export async function getInstructionByMnemonic(mnemonic: string, cpuType: string) {
    return (await db.select({
        from: 'instructions',
        where: {
            mnemonic: mnemonic
        },
        order: {
            by: 'id',
            type: 'desc'
        }
    }))[0] as Instruction | undefined;
}



export const getInstruction = async (id: number) => {

    const instruction = await getInstructionById(id);
    if (!instruction)
        return null;

    return instruction;
};

export const existsInstruction = async (id: number) => {
    return !!(await getInstructionById(id));
}

export const getInstructions = async (limit = 10, where: IWhereQuery = {}, order: IOrderQuery = { by: 'mnemonic', type: 'asc' }) => {
    let instructions = (await db.select({
        from: 'instructions',
        limit: limit,
        where: where,
        order: order
    })) as Instruction[];
    return instructions;
};


export const insertInstruction = async (instruction: Instruction) => {

    const defaultInstruction: Instruction = {
        id: 0,
        mnemonic: '',
        opcode: 0,
        type: 'R',
        description: '',
        controlSignals: {},
        funct: 0,
        operands: [],
        cpuType: 'basic',
    };

    const newInstruction = { ...defaultInstruction, ...instruction } as { [key: string]: any };

    delete newInstruction.id;
    newInstruction.size = JSON.stringify(newInstruction).length;
    // Add the instruction to the database
    console.log('Inserting instruction', newInstruction);

    await db.insert({
        into: 'instructions',
        values: [newInstruction]
    });

    const insertedInstruction = (await getInstructionByMnemonic(instruction.mnemonic, instruction.cpuType)) as Instruction | undefined;
    if (!insertedInstruction)
        throw new Error('Failed to create instruction');

    return insertedInstruction;
}

export const updateInstruction = async (instruction: Instruction) => {
    if (!instruction.id)
        throw new Error('Instruction id is required');
    const existingInstruction = await getInstructionById(instruction.id);
    if (!existingInstruction)
        throw new Error('Instruction does not exist');
    await db.update({
        in: 'instructions',
        set: instruction,
        where: {
            id: instruction.id
        }
    });
};

export const deleteInstruction = async (id: number) => {

    return await db.remove({
        from: 'instructions',
        where: {
            id: id
        }
    });
};





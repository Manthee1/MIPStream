export const baseControlSignals = {
    RegWrite: {
        bits: 1,
        name: "RegWrite",
    },
    MemtoReg: {
        bits: 1,
        name: "MemtoReg",
    },
    MemRead: {
        bits: 1,
        name: "MemRead",
    },
    MemWrite: {
        bits: 1,
        name: "MemWrite",
    },
    Branch: {
        bits: 1,
        name: "Branch",
    },
    ALUOp: {
        bits: 2,
        name: "ALUOp",
    },
    ALUSrc: {
        bits: 1,
        name: "ALUSrc",
    },
    RegDst: {
        bits: 1,
        name: "RegDst",
    },
};

export const controlSignalsWithJump = {
    ...baseControlSignals,
    Jump: {
        bits: 1,
        name: "Jump",
    },
};
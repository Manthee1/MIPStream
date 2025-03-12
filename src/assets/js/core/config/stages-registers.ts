import _ from "./cpu-variables";

export const stageRegisters = {
    IFtoID: {
        IR: _.IR_IF,
        NPC: _.NPC_IF,
    },
    IDtoEX: {
        IR: _.IR_ID,
        // Control Signals
        RegWrite: _.RegWrite_ID,
        MemtoReg: _.MemtoReg_ID,
        MemWrite: _.MemWrite_ID,
        MemRead: _.MemRead_ID,
        Branch: _.Branch_ID,
        ALUOp: _.ALUOp_ID,
        ALUSrc: _.ALUSrc_ID,
        RegDst: _.RegDst_ID,

        NPC: _.NPC_ID,

        // Data
        Reg1Data: _.Reg1Data_ID,
        Reg2Data: _.Reg2Data_ID,
        Imm: _.SignedImm_ID,
        Rd: _.Rd_ID,
        Rt: _.Rt_ID,


    },
    EXtoMEM: {
        IR: _.IR_EX,
        // Control Signals
        RegWrite: _.RegWrite_EX,
        MemtoReg: _.MemtoReg_EX,
        MemWrite: _.MemWrite_EX,
        MemRead: _.MemRead_EX,
        Branch: _.Branch_EX,

        TargetPC: _.TargetPC_EX,
        Zero: _.Zero_EX,
        ALUResult: _.ALUResult_EX,
        Reg2Data: _.Reg2Data_EX,
        WriteRegister: _.WriteRegister_EX,
    },
    MEMtoWB: {
        IR: _.IR_WB,
        // Control Signals
        RegWrite: _.RegWrite_WB,
        MemtoReg: _.MemtoReg_WB,

        ALUResult: _.ALUResult_WB,
        MemReadResult: _.MemReadResult_WB,
        WriteRegister: _.WriteRegister_WB,

    },
}
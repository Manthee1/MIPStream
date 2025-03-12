const cpuVariables = {
    PC: {} as Ref<number>,
    IR_IF: {} as Ref<number>,
    CONST4: {} as Ref<number>,
    NPC_IF: {} as Ref<number>,

    IR_ID: {} as Ref<number>,
    NPC_ID: {} as Ref<number>,
    OPCODE_ID: {} as Ref<number>,
    RegWrite_ID: {} as Ref<number>,
    MemtoReg_ID: {} as Ref<number>,
    MemWrite_ID: {} as Ref<number>,
    MemRead_ID: {} as Ref<number>,
    Branch_ID: {} as Ref<number>,
    ALUOp_ID: {} as Ref<number>,
    ALUSrc_ID: {} as Ref<number>,
    RegDst_ID: {} as Ref<number>,
    Reg1Data_ID: {} as Ref<number>,
    Reg2Data_ID: {} as Ref<number>,
    Imm_ID: {} as Ref<number>,
    SignedImm_ID: {} as Ref<number>,
    Rs_ID: {} as Ref<number>,
    Rt_ID: {} as Ref<number>,
    Rd_ID: {} as Ref<number>,

    IR_EX: {} as Ref<number>,
    NPC_EX: {} as Ref<number>,
    RegWrite_EX: {} as Ref<number>,
    MemtoReg_EX: {} as Ref<number>,
    MemWrite_EX: {} as Ref<number>,
    MemRead_EX: {} as Ref<number>,
    Branch_EX: {} as Ref<number>,
    ALUOp_EX: {} as Ref<number>,
    ALUSrc_EX: {} as Ref<number>,
    RegDst_EX: {} as Ref<number>,
    Rd_EX: {} as Ref<number>,
    Rt_EX: {} as Ref<number>,
    WriteRegister_EX: {} as Ref<number>,
    Reg1Data_EX: {} as Ref<number>,
    Reg2Data_EX: {} as Ref<number>,
    funct_EX: {} as Ref<number>,
    ALUCONTROL_EX: {} as Ref<number>,
    ALUIn1_EX: {} as Ref<number>,
    ALUIn2_EX: {} as Ref<number>,
    ALUResult_EX: {} as Ref<number>,
    Zero_EX: {} as Ref<number>,
    SignedImm_EX: {} as Ref<number>,
    ShiftedImm_EX: {} as Ref<number>,
    TargetPC_EX: {} as Ref<number>,

    IR_MEM: {} as Ref<number>,
    RegWrite_MEM: {} as Ref<number>,
    MemtoReg_MEM: {} as Ref<number>,
    MemWrite_MEM: {} as Ref<number>,
    MemRead_MEM: {} as Ref<number>,
    Branch_MEM: {} as Ref<number>,
    ALUResult_MEM: {} as Ref<number>,
    Zero_MEM: {} as Ref<number>,
    WriteRegister_MEM: {} as Ref<number>,
    Reg2Data_MEM: {} as Ref<number>,
    MemAddr_MEM: {} as Ref<number>,
    MemReadResult_MEM: {} as Ref<number>,
    BranchCond_MEM: {} as Ref<number>,
    TargetPC_MEM: {} as Ref<number>,
    NPC_MEM: {} as Ref<number>,

    IR_WB: {} as Ref<number>,
    RegWrite_WB: {} as Ref<number>,
    MemtoReg_WB: {} as Ref<number>,
    ALUResult_WB: {} as Ref<number>,
    MemReadResult_WB: {} as Ref<number>,
    WriteRegister_WB: {} as Ref<number>,
    WriteRegisterData_WB: {} as Ref<number>
}

// Make sure all the values are proxied
for (const key in cpuVariables) {
    cpuVariables[key]._value = 0;
    cpuVariables[key].key = key;
    Object.defineProperty(cpuVariables[key], 'value', {
        get() {
            return this._value;
        },
        set(value) {
            this._value = value;
        }
    });
}

export default cpuVariables;
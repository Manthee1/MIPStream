/** @format */

export const connections: ConnectionLayout[] = [
    {
        "id": 0,
        "from": "Const4.out",
        "to": "NextPCAdder.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 178,
                "y": 215
            },
            {
                "x": 178,
                "y": 215
            },
            {
                "x": 178,
                "y": 215
            }
        ],
        "fromPos": {
            "x": 159,
            "y": 215
        },
        "toPos": {
            "x": 193,
            "y": 215
        }
    },
    {
        "id": 1,
        "from": "NextPCAdder.in1",
        "to": "PC.out",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 178,
                "y": 185
            },
            {
                "x": 116,
                "y": 185
            },
            {
                "x": 116,
                "y": 370
            }
        ],
        "fromPos": {
            "x": 193,
            "y": 185
        },
        "toPos": {
            "x": 94,
            "y": 370
        }
    },
    {
        "id": 2,
        "from": "PC.out",
        "to": "InstructionMemory.address",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 133,
                "y": 370
            },
            {
                "x": 133,
                "y": 370
            },
            {
                "x": 133,
                "y": 370
            }
        ],
        "fromPos": {
            "x": 94,
            "y": 370
        },
        "toPos": {
            "x": 148,
            "y": 370
        }
    },
    {
        "id": 3,
        "from": "InstructionMemory.instruction",
        "to": "IFtoID.instructionIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 263,
                "y": 370
            },
            {
                "x": 275,
                "y": 370
            },
            {
                "x": 275,
                "y": 370
            }
        ],
        "fromPos": {
            "x": 248,
            "y": 370
        },
        "toPos": {
            "x": 290,
            "y": 370
        }
    },
    {
        "id": 4,
        "from": "NextPCAdder.out",
        "to": "IFtoID.PCIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 238,
                "y": 200
            },
            {
                "x": 239.04761904761904,
                "y": 200
            },
            {
                "x": 239.04761904761904,
                "y": 265
            }
        ],
        "fromPos": {
            "x": 223,
            "y": 200
        },
        "toPos": {
            "x": 290,
            "y": 265
        }
    },
    {
        "id": 5,
        "from": "IFtoID.PCInOut",
        "to": "IDtoEX.PCIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 265
            },
            {
                "x": 575,
                "y": 265
            },
            {
                "x": 575,
                "y": 265
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 265
        },
        "toPos": {
            "x": 590,
            "y": 265
        }
    },
    {
        "id": 6,
        "from": "IDtoEX.PCInOut",
        "to": "BranchAdder.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 635,
                "y": 236
            },
            {
                "x": 772,
                "y": 236
            },
            {
                "x": 772,
                "y": 236
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 265
        },
        "toPos": {
            "x": 787,
            "y": 236
        }
    },
    {
        "id": 7,
        "from": "BranchAdder.in2",
        "to": "ShiftLeft.out",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 772,
                "y": 266
            },
            {
                "x": 766,
                "y": 266
            },
            {
                "x": 766,
                "y": 278
            }
        ],
        "fromPos": {
            "x": 787,
            "y": 266
        },
        "toPos": {
            "x": 751,
            "y": 278
        }
    },
    {
        "id": 8,
        "from": "ShiftLeft.in",
        "to": "IDtoEX.immInOut",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 686,
                "y": 278
            },
            {
                "x": 636,
                "y": 278
            },
            {
                "x": 636,
                "y": 550
            }
        ],
        "fromPos": {
            "x": 701,
            "y": 278
        },
        "toPos": {
            "x": 620,
            "y": 550
        }
    },
    {
        "id": 9,
        "from": "IDtoEX.immInOut",
        "to": "ALUControl.funct",
        "type": "data",
        "bitRange": [
            0,
            6
        ],
        "bends": [
            {
                "x": 635,
                "y": 509
            },
            {
                "x": 762,
                "y": 509
            },
            {
                "x": 762,
                "y": 509
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 550
        },
        "toPos": {
            "x": 777,
            "y": 509
        }
    },
    {
        "id": 10,
        "from": "RegisterControlUnit.reg1Data",
        "to": "IDtoEX.reg1DataIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 563,
                "y": 369
            },
            {
                "x": 575,
                "y": 369
            },
            {
                "x": 575,
                "y": 350
            }
        ],
        "fromPos": {
            "x": 548,
            "y": 369
        },
        "toPos": {
            "x": 590,
            "y": 350
        }
    },
    {
        "id": 11,
        "from": "RegisterControlUnit.reg2Data",
        "to": "IDtoEX.reg2DataIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 563,
                "y": 409
            },
            {
                "x": 575,
                "y": 409
            },
            {
                "x": 575,
                "y": 459.5
            }
        ],
        "fromPos": {
            "x": 548,
            "y": 409
        },
        "toPos": {
            "x": 590,
            "y": 459.5
        }
    },
    {
        "id": 12,
        "from": "IDtoEX.reg2DataInOut",
        "to": "ALUSrcMUX.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 635,
                "y": 396
            },
            {
                "x": 698,
                "y": 396
            },
            {
                "x": 698,
                "y": 396
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 459.5
        },
        "toPos": {
            "x": 713,
            "y": 396
        }
    },
    {
        "id": 13,
        "from": "IDtoEX.immInOut",
        "to": "ALUSrcMUX.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 635,
                "y": 426
            },
            {
                "x": 698,
                "y": 426
            },
            {
                "x": 698,
                "y": 426
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 550
        },
        "toPos": {
            "x": 713,
            "y": 426
        }
    },
    {
        "id": 14,
        "from": "BranchAdder.out",
        "to": "EXtoMEM.targetPCIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 852,
                "y": 251
            },
            {
                "x": 865,
                "y": 251
            },
            {
                "x": 865,
                "y": 250
            }
        ],
        "fromPos": {
            "x": 817,
            "y": 251
        },
        "toPos": {
            "x": 880,
            "y": 251
        }
    },
    {
        "id": 15,
        "from": "ALU.zero",
        "to": "EXtoMEM.zeroIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 841,
                "y": 368
            },
            {
                "x": 865,
                "y": 368
            },
            {
                "x": 865,
                "y": 368
            }
        ],
        "fromPos": {
            "x": 826,
            "y": 368
        },
        "toPos": {
            "x": 880,
            "y": 368
        }
    },
    {
        "id": 16,
        "from": "ALU.ALUOut",
        "to": "EXtoMEM.ALUResultIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 841,
                "y": 380
            },
            {
                "x": 865,
                "y": 380
            },
            {
                "x": 865,
                "y": 380
            }
        ],
        "fromPos": {
            "x": 826,
            "y": 380
        },
        "toPos": {
            "x": 880,
            "y": 380
        }
    },
    {
        "id": 17,
        "from": "IDtoEX.reg2DataInOut",
        "to": "EXtoMEM.reg2DataIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 635,
                "y": 459.5
            },
            {
                "x": 865,
                "y": 459.5
            },
            {
                "x": 865,
                "y": 459.5
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 459.5
        },
        "toPos": {
            "x": 880,
            "y": 459.5
        }
    },
    {
        "id": 18,
        "from": "IFtoID.instructionInOut",
        "to": "RegisterControlUnit.reg1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 329
            },
            {
                "x": 413,
                "y": 329
            },
            {
                "x": 413,
                "y": 329
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 428,
            "y": 329
        }
    },
    {
        "id": 19,
        "from": "IFtoID.instructionInOut",
        "to": "RegisterControlUnit.reg2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 369
            },
            {
                "x": 413,
                "y": 369
            },
            {
                "x": 413,
                "y": 369
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 428,
            "y": 369
        }
    },
    {
        "id": 20,
        "from": "IFtoID.instructionInOut",
        "to": "ControlUnit.opcode",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 199
            },
            {
                "x": 396,
                "y": 199
            },
            {
                "x": 396,
                "y": 199
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 411,
            "y": 199
        }
    },
    {
        "id": 21,
        "from": "ControlUnit.RegWrite",
        "to": "IDtoEX.RegWriteIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 476,
                "y": 159
            },
            {
                "x": 575,
                "y": 159
            },
            {
                "x": 575,
                "y": 160
            }
        ],
        "fromPos": {
            "x": 461,
            "y": 159
        },
        "toPos": {
            "x": 590,
            "y": 160
        }
    },
    {
        "id": 22,
        "from": "ControlUnit.MemtoReg",
        "to": "IDtoEX.MemtoRegIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 476,
                "y": 169
            },
            {
                "x": 575,
                "y": 169
            },
            {
                "x": 575,
                "y": 170
            }
        ],
        "fromPos": {
            "x": 461,
            "y": 169
        },
        "toPos": {
            "x": 590,
            "y": 170
        }
    },
    {
        "id": 23,
        "from": "IDtoEX.MemWriteIn",
        "to": "ControlUnit.MemWrite",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 575,
                "y": 190
            },
            {
                "x": 476,
                "y": 190
            },
            {
                "x": 476,
                "y": 189
            }
        ],
        "fromPos": {
            "x": 590,
            "y": 190
        },
        "toPos": {
            "x": 461,
            "y": 189
        }
    },
    {
        "id": 24,
        "from": "ControlUnit.MemRead",
        "to": "IDtoEX.MemReadIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 476,
                "y": 179
            },
            {
                "x": 575,
                "y": 179
            },
            {
                "x": 575,
                "y": 180
            }
        ],
        "fromPos": {
            "x": 461,
            "y": 179
        },
        "toPos": {
            "x": 590,
            "y": 180
        }
    },
    {
        "id": 25,
        "from": "IDtoEX.BranchIn",
        "to": "ControlUnit.Branch",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 575,
                "y": 200
            },
            {
                "x": 476,
                "y": 200
            },
            {
                "x": 476,
                "y": 199
            }
        ],
        "fromPos": {
            "x": 590,
            "y": 200
        },
        "toPos": {
            "x": 461,
            "y": 199
        }
    },
    {
        "id": 26,
        "from": "ControlUnit.ALUOp",
        "to": "IDtoEX.ALUOpIn",
        "type": "control",
        "bitRange": [
            0,
            1
        ],
        "bends": [
            {
                "x": 476,
                "y": 209
            },
            {
                "x": 575,
                "y": 209
            },
            {
                "x": 575,
                "y": 210
            }
        ],
        "fromPos": {
            "x": 461,
            "y": 209
        },
        "toPos": {
            "x": 590,
            "y": 210
        }
    },
    {
        "id": 27,
        "from": "IDtoEX.ALUSrcIn",
        "to": "ControlUnit.ALUSrc",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 575,
                "y": 220
            },
            {
                "x": 476,
                "y": 220
            },
            {
                "x": 476,
                "y": 219
            }
        ],
        "fromPos": {
            "x": 590,
            "y": 220
        },
        "toPos": {
            "x": 461,
            "y": 219
        }
    },
    {
        "id": 28,
        "from": "ControlUnit.RegDst",
        "to": "IDtoEX.RegDstIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 476,
                "y": 229
            },
            {
                "x": 575,
                "y": 229
            },
            {
                "x": 575,
                "y": 230
            }
        ],
        "fromPos": {
            "x": 461,
            "y": 229
        },
        "toPos": {
            "x": 590,
            "y": 230
        }
    },
    {
        "id": 29,
        "from": "IDtoEX.RegWriteInOut",
        "to": "EXtoMEM.RegWriteIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 635,
                "y": 160
            },
            {
                "x": 865,
                "y": 160
            },
            {
                "x": 865,
                "y": 160
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 160
        },
        "toPos": {
            "x": 880,
            "y": 160
        }
    },
    {
        "id": 30,
        "from": "IDtoEX.MemtoRegInOut",
        "to": "EXtoMEM.MemtoRegIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 635,
                "y": 170
            },
            {
                "x": 865,
                "y": 170
            },
            {
                "x": 865,
                "y": 170
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 170
        },
        "toPos": {
            "x": 880,
            "y": 170
        }
    },
    {
        "id": 31,
        "from": "IDtoEX.MemWriteInOut",
        "to": "EXtoMEM.MemWriteIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 635,
                "y": 190
            },
            {
                "x": 865,
                "y": 190
            },
            {
                "x": 865,
                "y": 190
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 190
        },
        "toPos": {
            "x": 880,
            "y": 190
        }
    },
    {
        "id": 32,
        "from": "IDtoEX.MemReadInOut",
        "to": "EXtoMEM.MemReadIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 635,
                "y": 180
            },
            {
                "x": 865,
                "y": 180
            },
            {
                "x": 865,
                "y": 180
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 180
        },
        "toPos": {
            "x": 880,
            "y": 180
        }
    },
    {
        "id": 33,
        "from": "IDtoEX.BranchInOut",
        "to": "EXtoMEM.BranchIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 635,
                "y": 200
            },
            {
                "x": 865,
                "y": 200
            },
            {
                "x": 865,
                "y": 200
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 200
        },
        "toPos": {
            "x": 880,
            "y": 200
        }
    },
    {
        "id": 34,
        "from": "IDtoEX.ALUOpInOut",
        "to": "ALUControl.ALUOp",
        "type": "control",
        "bitRange": [
            0,
            1
        ],
        "bends": [
            {
                "x": 635,
                "y": 210
            },
            {
                "x": 854,
                "y": 210
            },
            {
                "x": 854,
                "y": 509
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 210
        },
        "toPos": {
            "x": 827,
            "y": 509
        }
    },
    {
        "id": 35,
        "from": "IDtoEX.ALUSrcInOut",
        "to": "ALUSrcMUX.control",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 681,
                "y": 220
            },
            {
                "x": 681,
                "y": 371
            },
            {
                "x": 725.5,
                "y": 371
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 220
        },
        "toPos": {
            "x": 725.5,
            "y": 386
        }
    },
    {
        "id": 36,
        "from": "IDtoEX.RegDstInOut",
        "to": "RegDstMUX.control",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 670,
                "y": 230
            },
            {
                "x": 670,
                "y": 575
            },
            {
                "x": 669.5,
                "y": 575
            }
        ],
        "fromPos": {
            "x": 620,
            "y": 230
        },
        "toPos": {
            "x": 669.5,
            "y": 590
        }
    },
    {
        "id": 37,
        "from": "EXtoMEM.BranchInOut",
        "to": "BranchAndGate.in1",
        "type": "control",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 200
            },
            {
                "x": 932,
                "y": 200
            },
            {
                "x": 932,
                "y": 309
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 200
        },
        "toPos": {
            "x": 967,
            "y": 309
        }
    },
    {
        "id": 38,
        "from": "EXtoMEM.zeroInOut",
        "to": "BranchAndGate.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 324
            },
            {
                "x": 951,
                "y": 324
            },
            {
                "x": 951,
                "y": 324
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 368
        },
        "toPos": {
            "x": 967,
            "y": 324
        }
    },
    {
        "id": 39,
        "from": "BranchAndGate.out",
        "to": "BranchMUX.control",
        "type": "control",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1007,
                "y": 285
            },
            {
                "x": 972.5,
                "y": 285
            },
            {
                "x": 972.5,
                "y": 275
            }
        ],
        "fromPos": {
            "x": 992,
            "y": 316.5
        },
        "toPos": {
            "x": 972.5,
            "y": 261
        }
    },
    {
        "id": 40,
        "from": "EXtoMEM.targetPCInOut",
        "to": "BranchMUX.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 251
            },
            {
                "x": 945,
                "y": 251
            },
            {
                "x": 945,
                "y": 251
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 251
        },
        "toPos": {
            "x": 960,
            "y": 251
        }
    },
    {
        "id": 41,
        "from": "NextPCAdder.out",
        "to": "BranchMUX.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 238,
                "y": 140.23569023569024
            },
            {
                "x": 945.3831041257367,
                "y": 140.23569023569024
            },
            {
                "x": 945.3831041257367,
                "y": 220
            }
        ],
        "fromPos": {
            "x": 223,
            "y": 200
        },
        "toPos": {
            "x": 960,
            "y": 221
        }
    },
    {
        "id": 42,
        "from": "EXtoMEM.RegWriteInOut",
        "to": "MEMtoWB.RegWriteIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 925,
                "y": 160
            },
            {
                "x": 1065,
                "y": 160
            },
            {
                "x": 1065,
                "y": 160
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 160
        },
        "toPos": {
            "x": 1080,
            "y": 160
        }
    },
    {
        "id": 43,
        "from": "EXtoMEM.MemtoRegInOut",
        "to": "MEMtoWB.MemtoRegIn",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 925,
                "y": 170
            },
            {
                "x": 1065,
                "y": 170
            },
            {
                "x": 1065,
                "y": 170
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 170
        },
        "toPos": {
            "x": 1080,
            "y": 170
        }
    },
    {
        "id": 44,
        "from": "EXtoMEM.ALUResultInOut",
        "to": "MEMtoWB.ALUResultIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 380
            },
            {
                "x": 932,
                "y": 380
            },
            {
                "x": 932,
                "y": 550
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 380
        },
        "toPos": {
            "x": 1080,
            "y": 550
        }
    },
    {
        "id": 45,
        "from": "DataMemory.readData",
        "to": "MEMtoWB.ReadDataIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1066,
                "y": 485
            },
            {
                "x": 1065,
                "y": 485
            },
            {
                "x": 1065,
                "y": 520
            }
        ],
        "fromPos": {
            "x": 1051,
            "y": 485
        },
        "toPos": {
            "x": 1080,
            "y": 520
        }
    },
    {
        "id": 46,
        "from": "MEMtoWB.ReadDataInOut",
        "to": "MemtoRegMUX.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1125,
                "y": 520
            },
            {
                "x": 1128,
                "y": 520
            },
            {
                "x": 1128,
                "y": 520
            }
        ],
        "fromPos": {
            "x": 1110,
            "y": 520
        },
        "toPos": {
            "x": 1143,
            "y": 520
        }
    },
    {
        "id": 47,
        "from": "MEMtoWB.ALUResultInOut",
        "to": "MemtoRegMUX.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1125,
                "y": 550
            },
            {
                "x": 1128,
                "y": 550
            },
            {
                "x": 1128,
                "y": 550
            }
        ],
        "fromPos": {
            "x": 1110,
            "y": 550
        },
        "toPos": {
            "x": 1143,
            "y": 550
        }
    },
    {
        "id": 48,
        "from": "MemtoRegMUX.control",
        "to": "MEMtoWB.MemtoRegInOut",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 1155.5,
                "y": 495
            },
            {
                "x": 1155.5,
                "y": 170
            },
            {
                "x": 1125,
                "y": 170
            }
        ],
        "fromPos": {
            "x": 1155.5,
            "y": 510
        },
        "toPos": {
            "x": 1110,
            "y": 170
        }
    },
    {
        "id": 49,
        "from": "MEMtoWB.RegWriteInOut",
        "to": "RegisterControlUnit.RegWrite",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 1134,
                "y": 160
            },
            {
                "x": 1134,
                "y": 108
            },
            {
                "x": 488,
                "y": 108
            }
        ],
        "fromPos": {
            "x": 1110,
            "y": 160
        },
        "toPos": {
            "x": 488,
            "y": 289
        }
    },
    {
        "id": 50,
        "from": "ALUControl.ALUControl",
        "to": "ALU.ALUControl",
        "type": "control",
        "bitRange": [
            0,
            3
        ],
        "bends": [
            {
                "x": 802,
                "y": 469
            },
            {
                "x": 802,
                "y": 445
            },
            {
                "x": 801,
                "y": 445
            }
        ],
        "fromPos": {
            "x": 802,
            "y": 484
        },
        "toPos": {
            "x": 801,
            "y": 430
        }
    },
    {
        "id": 51,
        "from": "EXtoMEM.ALUResultInOut",
        "to": "DataMemory.address",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 380
            },
            {
                "x": 936,
                "y": 380
            },
            {
                "x": 936,
                "y": 380
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 380
        },
        "toPos": {
            "x": 951,
            "y": 380
        }
    },
    {
        "id": 52,
        "from": "EXtoMEM.MemReadInOut",
        "to": "DataMemory.MemRead",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 925,
                "y": 180
            },
            {
                "x": 1031,
                "y": 180
            },
            {
                "x": 1031,
                "y": 353
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 180
        },
        "toPos": {
            "x": 1031,
            "y": 365
        }
    },
    {
        "id": 53,
        "from": "BranchMUX.out",
        "to": "PC.in",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1000,
                "y": 129
            },
            {
                "x": 23,
                "y": 129
            },
            {
                "x": 23,
                "y": 370
            }
        ],
        "fromPos": {
            "x": 985,
            "y": 236
        },
        "toPos": {
            "x": 44,
            "y": 370
        }
    },
    {
        "id": 54,
        "from": "IFtoID.instructionInOut",
        "to": "ImmExtend.in",
        "type": "data",
        "bitRange": [
            0,
            15
        ],
        "bends": [
            {
                "x": 335,
                "y": 550
            },
            {
                "x": 486,
                "y": 550
            },
            {
                "x": 486,
                "y": 550
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 501,
            "y": 550
        }
    },
    {
        "id": 55,
        "from": "ImmExtend.out",
        "to": "IDtoEX.immIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 566,
                "y": 550
            },
            {
                "x": 575,
                "y": 550
            },
            {
                "x": 575,
                "y": 550
            }
        ],
        "fromPos": {
            "x": 551,
            "y": 550
        },
        "toPos": {
            "x": 590,
            "y": 550
        }
    },
    {
        "id": 56,
        "from": "IFtoID.instructionInOut",
        "to": "IDtoEX.RdIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 370
            },
            {
                "x": 334,
                "y": 370
            },
            {
                "x": 334,
                "y": 630
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 590,
            "y": 630
        }
    },
    {
        "id": 57,
        "from": "IFtoID.instructionInOut",
        "to": "IDtoEX.RtIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 335,
                "y": 370
            },
            {
                "x": 335,
                "y": 370
            },
            {
                "x": 335,
                "y": 600
            }
        ],
        "fromPos": {
            "x": 320,
            "y": 370
        },
        "toPos": {
            "x": 590,
            "y": 600
        }
    },
    {
        "id": 58,
        "from": "RegDstMUX.out",
        "to": "EXtoMEM.RtIn",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 697,
                "y": 615
            },
            {
                "x": 865,
                "y": 615
            },
            {
                "x": 865,
                "y": 615
            }
        ],
        "fromPos": {
            "x": 682,
            "y": 615
        },
        "toPos": {
            "x": 880,
            "y": 615
        }
    },
    {
        "id": 59,
        "from": "EXtoMEM.RtInOut",
        "to": "MEMtoWB.RtIn",
        "type": "data",
        "bitRange": [
            0,
            4
        ],
        "bends": [
            {
                "x": 925,
                "y": 615
            },
            {
                "x": 1065,
                "y": 615
            },
            {
                "x": 1065,
                "y": 615
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 615
        },
        "toPos": {
            "x": 1080,
            "y": 615
        }
    },
    {
        "id": 60,
        "from": "EXtoMEM.reg2DataInOut",
        "to": "DataMemory.writeData",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 925,
                "y": 459.5
            },
            {
                "x": 936,
                "y": 459.5
            },
            {
                "x": 936,
                "y": 459.5
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 459.5
        },
        "toPos": {
            "x": 951,
            "y": 459.5
        }
    },
    {
        "id": 61,
        "from": "MEMtoWB.RtInOut",
        "to": "RegisterControlUnit.write",
        "type": "data",
        "bitRange": [
            0,
            4
        ],
        "bends": [
            {
                "x": 1125,
                "y": 663
            },
            {
                "x": 402,
                "y": 663
            },
            {
                "x": 402,
                "y": 409
            }
        ],
        "fromPos": {
            "x": 1110,
            "y": 615
        },
        "toPos": {
            "x": 428,
            "y": 409
        }
    },
    {
        "id": 62,
        "from": "MemtoRegMUX.out",
        "to": "RegisterControlUnit.data",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 1183,
                "y": 675
            },
            {
                "x": 413,
                "y": 675
            },
            {
                "x": 413,
                "y": 449
            }
        ],
        "fromPos": {
            "x": 1168,
            "y": 535
        },
        "toPos": {
            "x": 428,
            "y": 449
        }
    },
    {
        "id": 63,
        "from": "ALUSrcMUX.out",
        "to": "ALU.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [
            {
                "x": 753,
                "y": 410
            },
            {
                "x": 761,
                "y": 410
            },
            {
                "x": 761,
                "y": 410
            }
        ],
        "fromPos": {
            "x": 738,
            "y": 411
        },
        "toPos": {
            "x": 776,
            "y": 410
        }
    },
    {
        "id": 64,
        "from": "IDtoEX.RtInOut",
        "to": "RegDstMUX.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [],
        "fromPos": {
            "x": 620,
            "y": 600
        },
        "toPos": {
            "x": 657,
            "y": 600
        }
    },
    {
        "id": 65,
        "from": "IDtoEX.RdInOut",
        "to": "RegDstMUX.in2",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [],
        "fromPos": {
            "x": 620,
            "y": 630
        },
        "toPos": {
            "x": 657,
            "y": 630
        }
    },
    {
        "id": 66,
        "from": "EXtoMEM.MemWriteInOut",
        "to": "DataMemory.MemWrite",
        "type": "control",
        "bitRange": [
            0,
            0
        ],
        "bends": [
            {
                "x": 1020.9523809523808,
                "y": 190
            },
            {
                "x": 1020.9523809523808,
                "y": 350
            },
            {
                "x": 971,
                "y": 350
            }
        ],
        "fromPos": {
            "x": 910,
            "y": 190
        },
        "toPos": {
            "x": 971,
            "y": 365
        }
    },
    {
        "id": 67,
        "from": "IDtoEX.reg1DataInOut",
        "to": "ALU.in1",
        "type": "data",
        "bitRange": [
            0,
            31
        ],
        "bends": [],
        "fromPos": {
            "x": 620,
            "y": 350
        },
        "toPos": {
            "x": 776,
            "y": 350
        }
    }
]
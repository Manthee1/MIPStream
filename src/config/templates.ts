import { ArchitectureConfig } from "../shared/types/architecture";
import { ProjectEditor } from "../shared/types/project";

export const BLANK_ARCHITECTURE: ArchitectureConfig = {
    name: 'Blank',
    description: 'A completely empty architecture.',
    modules: [],
    nets: [],
    configuration: {
        pipeline: {
            enabled: false,
            stages: [],
        },
        assembler: {
            mappings: [],
        },
        isa: {
            format_name: 'Custom',
            total_bits: 32,
            fields: [],
            instructions: [],
        }
    }
};

export const MIPS_ISA_DEFINITION = {
    format_name: 'MIPS32',
    total_bits: 32,
    fields: [
        { name: 'opcode', bits: 6, type: 'constant' as const },
        { name: 'rs', bits: 5, type: 'register' as const },
        { name: 'rt', bits: 5, type: 'register' as const },
        { name: 'rd', bits: 5, type: 'register' as const },
        { name: 'shamt', bits: 5, type: 'constant' as const },
        { name: 'funct', bits: 6, type: 'constant' as const },
    ],
    instructions: [
        { mnemonic: 'ADD', field_values: { opcode: 0, funct: 32 }, operands: ['rd', 'rs', 'rt'] },
        { mnemonic: 'SUB', field_values: { opcode: 0, funct: 34 }, operands: ['rd', 'rs', 'rt'] },
    ]
};

export const BASIC_MIPS_ARCHITECTURE: ArchitectureConfig = {
    name: 'Basic MIPS',
    description: 'A basic single-cycle MIPS architecture.',
    modules: [], // In a real scenario, this would have pre-placed modules
    nets: [],
    configuration: {
        pipeline: {
            enabled: false,
            stages: [
                { id: 'IF', name: 'Instruction Fetch' },
                { id: 'ID', name: 'Instruction Decode' },
                { id: 'EX', name: 'Execute' },
                { id: 'MEM', name: 'Memory' },
                { id: 'WB', name: 'Write Back' },
            ],
        },
        assembler: {
            mappings: [
                { editorId: 'main', memoryModuleId: 'imem' }
            ],
        },
        isa: MIPS_ISA_DEFINITION
    }
};

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    architecture: ArchitectureConfig;
    initialSoftware?: ProjectEditor[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'blank',
        name: 'Blank Project',
        description: 'Start from scratch with no components.',
        icon: 'IconCpu',
        architecture: BLANK_ARCHITECTURE,
        initialSoftware: [
            { id: 'main', name: 'main.s', sourceCode: '' }
        ]
    },
    {
        id: 'mips-basic',
        name: 'MIPS Single Cycle',
        description: 'Pre-configured single-cycle MIPS CPU.',
        icon: 'IconHierarchy2',
        architecture: BASIC_MIPS_ARCHITECTURE,
        initialSoftware: [
            { id: 'main', name: 'main.s', sourceCode: '.text\nmain:\n    ADD $t0, $t1, $t2\n' }
        ],
    }
];

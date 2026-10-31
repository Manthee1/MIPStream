import { ArchitectureConfig } from "../shared/types/architecture";
import { ProjectEditor } from "../shared/types/project";
import { MIPS_ASSEMBLER_CONFIG } from "./isa-presets";
import { MIPS_SINGLE_CYCLE_MODULES, MIPS_SINGLE_CYCLE_NETS } from "./mips-single-cycle-datapath";

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
            instruction_types: [],
            instruction_set_config: [],
        }
    }
};

export const MIPS_ISA_DEFINITION = MIPS_ASSEMBLER_CONFIG;

export const BASIC_MIPS_ARCHITECTURE: ArchitectureConfig = {
    name: 'Basic MIPS',
    description: 'A basic single-cycle MIPS architecture.',
    // The golden single-cycle datapath — the same serialized netlist the
    // headless Rig C check executes (see src/config/mips-single-cycle-datapath.ts
    // for the layout, wiring and timing-model documentation). The designators
    // `imem` (assembler mapping target) and `pc` (halt detection) are load-
    // bearing and must stay stable.
    modules: MIPS_SINGLE_CYCLE_MODULES,
    nets: MIPS_SINGLE_CYCLE_NETS,
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
                { editorId: 'main', memoryModuleIds: ['imem'] }
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
        // Square-by-repeated-addition: loads `value` from .data, accumulates
        // value × value through a beq loop with slt as the condition, stores
        // the result, and halts. Exercises lw/addi/add/slt/beq/sw/halt on the
        // shipped datapath — the same program the Rig C check runs.
        initialSoftware: [
            {
                id: 'main', name: 'main.s', sourceCode:
                    '.data\n' +
                    'value:  .word 7\n' +
                    'result: .word 0\n' +
                    '\n' +
                    '.text\n' +
                    'main:\n' +
                    '    lw   $t0, value\n' +
                    '    addi $t1, $zero, 0\n' +
                    '    addi $t2, $zero, 0\n' +
                    '\n' +
                    'sum:\n' +
                    '    add  $t1, $t1, $t0\n' +
                    '    addi $t2, $t2, 1\n' +
                    '    slt  $t3, $t2, $t0\n' +
                    '    beq  $t3, $zero, done\n' +
                    '    beq  $zero, $zero, sum\n' +
                    '\n' +
                    'done:\n' +
                    '    sw   $t1, result\n' +
                    '    halt\n'
            }
        ],
    }
];

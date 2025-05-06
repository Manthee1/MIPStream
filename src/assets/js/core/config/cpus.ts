import { MIPSBasicFlush } from "../cpus/MIPSBasicFlush";
import { MIPSJump } from "../cpus/MIPSJump";
import MIPSBase from "../MIPSBase";

interface CPUTypeConfig {
    name: string;
    description: string;
    cpu: typeof MIPSBase;
}


export const CPUS: Record<string, CPUTypeConfig> = {
    "basic": {
        name: "Basic",
        description: "Basic CPU with no special features.",
        cpu: MIPSBase
    },
    'basic-jump': {
        name: 'Basic with Jump',
        description: 'Basic MIPS CPU with unconditional jumps.',
        cpu: MIPSJump
    },
    // 'basic-flush': {
    //     name: 'Basic with Flush',
    //     description: 'Basic MIPS CPU with flush support for branch instructions. When a branch instruction makes it to the MEM stage, all previous stages are flushed.',
    //     cpu: MIPSBasicFlush
    // },
    // 'data-hazard': {
    //     name: 'Data Hazard',
    //     description: 'Basic MIPS CPU with data hazard detection.',
    //     cpu: MIPSBase
    // },
    // 'forwarding': {
    //     name: 'Forwarding',
    //     description: 'Basic MIPS CPU with forwarding.',
    //     cpu: MIPSBase
    // },
}
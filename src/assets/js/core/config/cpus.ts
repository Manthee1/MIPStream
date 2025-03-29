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
    'data-hazard': {
        name: 'Data Hazard',
        description: 'Basic MIPS CPU with data hazard detection.',
        cpu: MIPSBase
    },
    'forwarding': {
        name: 'Forwarding',
        description: 'Basic MIPS CPU with forwarding.',
        cpu: MIPSBase
    },
}
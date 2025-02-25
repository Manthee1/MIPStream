interface Port {
    name: string;
    bits: number;
}


interface Stage {
    id: string;
    name: string;
    description: string;
    components?: Array<string>;
    activateOnClock: 'RISING_EDGE' | 'FALLING_EDGE';
}

type StageRegisterPort = Port;

interface StageRegister {
    id: string;
    name: string;
    ports: Array<StageRegisterPort>;
}


interface StageRegisterMapped {
    id: string;
    name: string;
    ports: Map<string, StageRegisterPort>;
}


interface CPUConfig {
    instructions: InstructionConfig[]
    controlSignals: ControlSignal[]
    stages: Array<Stage>;
    stageRegisters: Array<StageRegister>;
    components: Array<ComponentBase>;
    connections: Array<ComponentConnection>;
}

interface CPUConfigMapped {
    instructions: Map<string, InstructionConfig>
    controlSignals: Map<string, ControlSignal>
    stages: Map<string, Stage>
    stageRegisters: Map<string, StageRegisterMapped>
    components: Map<string, ComponentBase>
    connections: Map<string, ComponentConnection>
}


type CPUOptionsConfig = Array<{
    label: string;
    key: string;
    default: any;
    type: 'number' | 'string' | 'boolean';
    min?: number;
    max?: number;
    verify?: (value: any) => boolean | never;
}>


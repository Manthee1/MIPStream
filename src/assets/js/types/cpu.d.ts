interface CPUConfig {
    instructions: InstructionConfig[]
    controlSignals: ControlSignal[]
    stages: Array<{
        id: string;
        name: string;
        description: string;
        components?: Array<string>;
        activateOnClock: 'RISING_EDGE' | 'FALLING_EDGE';
    }>;
    stageRegisters: Array<{
        id: string;
        name: string;
        ports: Array<{
            name: string;
            bits: number;
        }>;
    }>;
    components: Array<ComponentBase>;
    connections: Array<ComponentConnection>;
}
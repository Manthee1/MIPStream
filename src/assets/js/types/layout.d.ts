
interface Position {
    x: number;
    y: number;
}
interface Dimensions {
    width: number;
    height: number;
}

interface PortLayout {
    id: string;
    label: string;
    type?: 'input' | 'output';
    location: 'top' | 'bottom' | 'left' | 'right';
    bits: number;
    value: Ref<number> | number;
    relPos: number; // a number smaller or equal to 1. Represents the position of the port on the side of the component
    pos?: Position // the absolute position of the port. used by the diagram for drawing
}

interface ComponentLayout {
    id: string;
    label: string;
    description?: string;
    type: 'register' | 'stage_register' | 'and' | 'or' | 'mux' | 'mux_reverse' | 'adder' | 'control_unit' | 'alu' | 'shift' | 'sign_extend' | 'register_unit' | 'const' | 'instruction_memory' | 'data_memory';
    dimensions: Dimensions;
    pos: Position;
    ports?: Array<PortLayout>;
}

interface ConnectionLayout {
    id?: number;
    from: string; // id of the to port
    to: string; // id of the from port
    bends: Array<Position>;
    bitRange: [number, number];
    type: 'data' | 'control';
    fromPos?: Position;
    toPos?: Position;
}

interface CPULayout {
    width: number;
    height: number;
    components: Array<ComponentLayout>;
    ports?: Array<PortLayout>;
    connections: Array<ConnectionLayout>;
}


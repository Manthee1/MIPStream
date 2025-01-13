
interface Position {
    x: number;
    y: number;
}

interface CanvasPoint {
    x: number | 'center';
    y: number | 'center';
}
interface Dimensions {
    width: number;
    height: number;
}

interface PortLayout {
    name: string;
    location: 'top' | 'bottom' | 'left' | 'right';
    // there is no x or y, just a relative position on the side of the component
    relPos: number; // a number smaller or equal to 1. Represents the position of the port on the side of the component
    pos?: CanvasPoint // the absolute position of the port. used by the layout editor
}

interface ComponentLayout {
    id: string;
    dimensions: Dimensions;
    pos: CanvasPoint;
    ports?: Array<PortLayout>;
}

interface ComponentLayoutMapped {
    id: string;
    dimensions: Dimensions;
    pos: Position;
    ports: Map<string, PortLayout>;
}

interface CPULayout {
    width: number;
    height: number;
    components: Array<ComponentLayout>;

}

interface CPULayoutMapped {
    width: number;
    height: number;
    components: Map<string, ComponentLayoutMapped>;
}


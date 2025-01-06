interface Position {
    x: number;
    y: number;
}
interface Dimensions {
    width: number;
    height: number;
}

interface CPULayout {
    width: number;
    height: number;
    components: Array<{
        id: string;
        dimensions: Dimensions;
        pos: Position;
    }>;
}


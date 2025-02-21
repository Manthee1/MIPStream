export interface SpatialItem {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
}

class SpatialMap {
    private items: Map<string, SpatialItem> = new Map();
    private map: Array<Array<Array<string>>> = [];
    private width: number;
    private height: number;
    private cellSize: number;


    constructor(width: number, height: number, cellsPerRow: number) {
        this.width = width;
        this.height = height;

        this.cellSize = width / cellsPerRow;
        const rows = Math.ceil(height / this.cellSize);
        const cols = Math.ceil(width / this.cellSize);

        for (let i = 0; i < rows; i++)
            this.map[i] = new Array(cols).fill([]).map(() => []);

    }

    private getCellPosition(x: number, y: number): { row: number, col: number } {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw new Error('Out of bounds',);
        const row = Math.floor(y / this.cellSize);
        const col = Math.floor(x / this.cellSize);

        return { row, col };
    }

    private getCells(x: number, y: number, width: number, height: number): Array<{ row: number, col: number }> {
        const { row, col } = this.getCellPosition(x, y);
        const { row: rowEnd, col: colEnd } = this.getCellPosition(x + width, y + height);

        const cells = [];
        for (let i = row; i <= rowEnd; i++) {
            for (let j = col; j <= colEnd; j++) {
                cells.push({ row: i, col: j });
            }
        }

        return cells;
    }

    private getCell(x: number, y: number) {
        const { row, col } = this.getCellPosition(x, y);
        return this.map[row][col];
    }

    public insert(id: string, position: { x: number, y: number }, size: { width: number, height: number }, type: string) {
        // Add the item to items and map
        const item: SpatialItem = { id, ...position, ...size, type };
        this.items.set(id, item);
        const cells = this.getCells(item.x, item.y, item.width, item.height);
        for (const cell of cells) {
            this.map[cell.row][cell.col].push(item.id);
        }
    }

    public update(id: string, position: { x?: number, y?: number }, size: { width?: number, height?: number }, type?: string) {
        const item = this.items.get(id);
        if (!item) return;

        // Remove the item from the map
        const cells = this.getCells(item.x, item.y, item.width, item.height);
        for (const cell of cells) {
            const index = this.map[cell.row][cell.col].indexOf(id);
            if (index !== -1) this.map[cell.row][cell.col].splice(index, 1);
        }

        // Update the item
        item.x = position.x ?? item.x;
        item.y = position.y ?? item.y;
        item.width = size.width ?? item.width;
        item.height = size.height ?? item.height;
        item.type = type ?? item.type;

        // Add the item to the map
        const newCells = this.getCells(item.x, item.y, item.width, item.height);
        for (const cell of newCells) {
            this.map[cell.row][cell.col].push(item.id);
        }
    }

    public remove(id: string) {
        const item = this.items.get(id);
        if (!item) return;

        const cells = this.getCells(item.x, item.y, item.width, item.height);
        for (const cell of cells) {
            const index = this.map[cell.row][cell.col].indexOf(id);
            if (index !== -1) this.map[cell.row][cell.col].splice(index, 1);
        }

        this.items.delete(id);

    }

    public query(x: number, y: number): SpatialItem | null {
        // Search the cell
        const cell = this.getCell(x, y);

        // Get the item that is exactly in that position
        const itemId = cell.find((id) => {
            const item = this.items.get(id);
            if (!item) return false;
            return x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height;
        });
        if (!itemId) return null;

        return this.items.get(itemId) ?? null;
    }
}

export default SpatialMap;
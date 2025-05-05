import { useProjectStore } from "../../../../../stores/projectStore";
import { decToBinary, decToHex } from "../../../utils";
import { SpatialItem } from "../../../utils/SpatialMap";
import { CPUDiagram, CPUDiagramPlugin } from "../CPUDiagram";

interface InfoBoxBodyContentConfig {
    type: 'text' | 'table' | 'list',
    data: any,
}

export class DiagramInteraction extends CPUDiagramPlugin {
    mouse: { x: number, y: number, isDown: boolean, lastClick: { x: number, y: number } } = { x: 0, y: 0, isDown: false, lastClick: { x: 0, y: 0 } };
    keyboard: { keys: { [key: string]: boolean } } = { keys: {} };

    hoveringOver: SpatialItem | null = null;


    constructor(cpuDiagram: CPUDiagram) {
        super(cpuDiagram);
        this.initializeMouseEvents();
    }

    get scaleX() {
        return this.cpuDiagram.canvas.width / this.cpuDiagram.canvas.clientWidth;
    }

    get scaleY() {
        return this.cpuDiagram.canvas.height / this.cpuDiagram.canvas.clientHeight;
    }


    initializeMouseEvents() {

        this.cpuDiagram.canvas.addEventListener('mousemove', this.mouseMove);

        this.cpuDiagram.canvas.addEventListener('mousedown', this.mouseDown);

        this.cpuDiagram.canvas.addEventListener('mouseup', this.mouseUp);

        // document.addEventListener('keydown', (e) => {
        //     this.keyboard.keys[e.key] = true;
        //     this.keyDownHandler(e);
        // });

        // document.addEventListener('keyup', (e) => {
        //     this.keyboard.keys[e.key] = false;
        // });
    }




    mouseMove = (e: MouseEvent) => {
        this.mouse.x = e.offsetX * this.scaleX;
        this.mouse.y = e.offsetY * this.scaleY;


        if (this.hoveringOver != this.cpuDiagram.spatialMap.query(this.mouse.x, this.mouse.y)) {
            this.hoveringOver = this.cpuDiagram.spatialMap.query(this.mouse.x, this.mouse.y);
            this.cpuDiagram.draw();
        }
    }

    mouseDown = (e: MouseEvent) => {
        this.mouse.isDown = true;
        this.mouse.lastClick = { x: this.mouse.x * this.scaleX, y: this.mouse.y * this.scaleY };
    }

    mouseUp = (e: MouseEvent) => {
        this.mouse.isDown = false;
    }

    keyDownHandler(e: KeyboardEvent) {
        console.log('key down', e.key);
    }

    keyUpHandler(e: KeyboardEvent) {
        console.log('key up', e.key);
    }



    drawInfoBox(x: number, y: number, title: string, subtitle: string, description: string, content?: InfoBoxBodyContentConfig) {
        const ctx = this.cpuDiagram.ctx;
        const padding = 10;
        const titleHeight = 18;
        const subtitleHeight = 15;
        const descriptionHeight = 12;
        const contentItemHeight = 12;
        const width = 200;
        const widthWithoutPadding = width - padding * 2;


        const isEmpty = function (s: string) {
            return s == null || s.trim() == '';
        }

        const height =
            (isEmpty(title) ? 0 : (titleHeight + padding)) +
            (isEmpty(subtitle) ? 0 : (subtitleHeight + padding)) +
            (isEmpty(description) ? 0 : ((descriptionHeight) * Math.ceil((description.length * 10) / (widthWithoutPadding))) + padding) +
            (content ? (((content.data.length ?? (content.data.body ? (content.data.body.length) : undefined) ?? 0) * contentItemHeight) + padding * 2) : 0);



        // If the box is too close to the right edge of the canvas, move it to the left
        if (x + width > this.cpuDiagram.canvas.width) {
            x = this.cpuDiagram.canvas.width - width;
        }

        // If the box is too close to the bottom edge of the canvas, move it up
        if (y + height > this.cpuDiagram.canvas.height) {
            y = this.cpuDiagram.canvas.height - height;
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 5)
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.fillStyle = 'black';

        let nextY = y + padding;
        let nextX = x + padding;

        if (!isEmpty(title)) {
            this.cpuDiagram.drawText(title, nextX, nextY, 'black', `bold ${titleHeight}px Arial`, 'left', 'top', widthWithoutPadding);
            nextY += titleHeight + padding;
        }
        if (!isEmpty(subtitle)) {
            this.cpuDiagram.drawText(subtitle, nextX, nextY, 'black', `${subtitleHeight}px Arial`, 'left', 'middle', widthWithoutPadding);
            nextY += subtitleHeight + padding;
        }

        if (!isEmpty(description)) {
            this.cpuDiagram.drawText(description, nextX, nextY, 'black', `${descriptionHeight}px Arial`, 'left', 'middle', widthWithoutPadding);
            nextY += descriptionHeight * Math.ceil((description.length * 10) / (widthWithoutPadding));
        }
        if (!content) return;

        switch (content.type) {
            case 'text':
                for (let i = 0; i < content.data.length; i++) {
                    const item = content.data[i];
                    this.cpuDiagram.drawText(item, nextX, nextY, 'black', `${contentItemHeight}px Arial`, 'left', 'middle', widthWithoutPadding);
                    nextY += 12;
                }
                break;

            case 'table':
                const table = content.data;
                const header = table.header;
                const body = table.body;
                const headerHeight = 12;
                const bodyHeight = 12;
                const headerY = nextY;
                const bodyY = headerY// + headerHeight;
                // for (let i = 0; i < header.length; i++) {
                //     ctx.fillText(header[i], nextX + i * columnWidth, headerY);
                // }


                // find the column widths for each column
                const columnWidths = [0, 0, 0, 0, 0,]
                for (let i = 0; i < body.length; i++) {
                    const row = body[i];
                    for (let j = 0; j < row.length; j++) {
                        columnWidths[j] = Math.max(columnWidths[j], ctx.measureText((row[j]).toString()).width);
                    }
                }

                console.log(columnWidths);


                for (let i = 0; i < body.length; i++) {
                    // Find the longest row and use it as the column width
                    const row = body[i];

                    let nextX = x + padding;
                    for (let j = 0; j < row.length; j++) {
                        ctx.fillText(row[j], nextX, bodyY + i * bodyHeight);
                        nextX += columnWidths[j] + padding;
                    }
                }
                // nextY = bodyY + body.length * bodyHeight;
                break;
            case 'list':
                break;
            default:
                break;
        }


    }

    draw(): void {
        if (this.hoveringOver) {
            switch (this.hoveringOver.type) {
                case 'component': {
                    const component = this.cpuDiagram.components.get(this.hoveringOver.id);
                    if (!component) return;
                    const content = component.ports ? {
                        type: 'table',
                        data: {
                            header: ['Type', 'Port', 'Value'],
                            body: component.ports.map((port) => {
                                let value: string | number = port.value instanceof Object ? port.value.value : port.value;
                                if (useProjectStore().getProjectSetting('diagramValueRepresentation') == 'hex') value = '0x' + value.toString(16);
                                else if (useProjectStore().getProjectSetting('diagramValueRepresentation') == 'bin') value = '0b' + value.toString(2);
                                return [port.type == 'input' ? 'in' : 'out', port.label, value]
                            })
                        }
                    } as InfoBoxBodyContentConfig : undefined;

                    this.drawInfoBox(component.pos.x + component.dimensions.width + 5, component.pos.y, component.label, component.type, component.description ?? '', content);

                    break;
                }
                case 'port': {
                    const port = this.cpuDiagram.ports.get(this.hoveringOver.id);
                    if (!port) return;
                    let value: string | number = port.value instanceof Object ? port.value.value : port.value;

                    if (useProjectStore().getProjectSetting('diagramValueRepresentation') == 'hex') {
                        value = '0x' + decToHex(value, port.bits);
                    } else if (useProjectStore().getProjectSetting('diagramValueRepresentation') == 'bin') {
                        value = '0b' + decToBinary(value, port.bits);
                    }
                    const content: InfoBoxBodyContentConfig = {
                        type: 'text',
                        data: [`Value: ${value}`, `Bits: ${port.bits}`]
                    }

                    this.drawInfoBox(this.mouse.x, this.mouse.y, port.label, port.type ?? '', '', content);
                    break;
                }
                case 'connection':
                    // const connection = this.cpuDiagram.connections.get(parseInt(this.hoveringOver.id));
                    // if (!connection) return;
                    // this.drawInfoBox(this.mouse.x, this.mouse.y, 'Connection', connection.type, '', {
                    //     type: 'text',
                    //     data: [`From: ${connection.from}`, `To: ${connection.to}`, `Bits: ${connection.bitRange[0]}-${connection.bitRange[1]}`]
                    // });


                    break;
                default:
                    break;
            }
        }
    }


    destroy() {
        this.cpuDiagram.canvas.removeEventListener('mousemove', this.mouseMove);
        this.cpuDiagram.canvas.removeEventListener('mousedown', this.mouseDown);
        this.cpuDiagram.canvas.removeEventListener('mouseup', this.mouseUp);
        // document.removeEventListener('keydown', this.keyDownHandler);
        // document.removeEventListener('keyup', this.keyUpHandler);
    }

}
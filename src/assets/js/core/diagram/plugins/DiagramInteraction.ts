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

        this.cpuDiagram.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.offsetX * this.scaleX;
            this.mouse.y = e.offsetY * this.scaleY;
            this.mouseMove();
        });

        this.cpuDiagram.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.mouse.lastClick = { x: this.mouse.x * this.scaleX, y: this.mouse.y * this.scaleY };
            this.mouseDown();
        });

        this.cpuDiagram.canvas.addEventListener('mouseup', (e) => {
            this.mouse.isDown = false;
            this.mouseUp();
        });

        // document.addEventListener('keydown', (e) => {
        //     this.keyboard.keys[e.key] = true;
        //     this.keyDownHandler(e);
        // });

        // document.addEventListener('keyup', (e) => {
        //     this.keyboard.keys[e.key] = false;
        // });
    }




    mouseMove() {


        if (this.hoveringOver != this.cpuDiagram.spatialMap.query(this.mouse.x, this.mouse.y)) {
            this.hoveringOver = this.cpuDiagram.spatialMap.query(this.mouse.x, this.mouse.y);
            this.cpuDiagram.draw();
        }
    }

    mouseDown() {
    }

    mouseUp() {
    }

    keyDownHandler(e: KeyboardEvent) {
        console.log('key down', e.key);
    }

    keyUpHandler(e: KeyboardEvent) {
        console.log('key up', e.key);
    }



    drawInfoBox(x: number, y: number, title: string, subtitle: string, description: string, content: InfoBoxBodyContentConfig[] = []) {
        const ctx = this.cpuDiagram.ctx;
        const padding = 10;
        const titleHeight = 20;
        const subtitleHeight = 15;
        const descriptionHeight = 15;
        const width = 200;


        const isEmpty = function (s: string) {
            return s == null || s.trim() == '';
        }

        const height = (!isEmpty(title) && (titleHeight + padding)) + (!isEmpty(subtitle) && (subtitleHeight + padding)) + (!isEmpty(description) && (descriptionHeight + padding));



        // If the box is too close to the right edge of the canvas, move it to the left
        if (x + width > this.cpuDiagram.canvas.width) {
            x = this.cpuDiagram.canvas.width - width;
        }

        // If the box is too close to the bottom edge of the canvas, move it up
        if (y + height > this.cpuDiagram.canvas.height) {
            y = this.cpuDiagram.canvas.height - height;
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, width, height);

        let nextY = y + padding;
        let nextX = x + padding;

        if (!isEmpty(title)) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(title, nextX, nextY);
            nextY += titleHeight + padding;
        }
        if (!isEmpty(subtitle)) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(subtitle, nextX, nextY);
            nextY += subtitleHeight + padding;
        }

        if (!isEmpty(description)) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(description, nextX, nextY);
            nextY += descriptionHeight + padding;
        }

        for (let i = 0; i < content.length; i++) {
            const item = content[i];
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            switch (item.type) {
                case 'text':
                    ctx.fillText(item.data, nextX, nextY);
                    break;
                case 'table':
                    for (let j = 0; j < item.data.length; j++) {
                        ctx.fillText(item.data[j][0] + ': ' + item.data[j][1], nextX, nextY);
                    }
                    break;
                case 'list':
                    for (let j = 0; j < item.data.length; j++) {
                        ctx.fillText('- ' + item.data[j], nextX, nextY);
                    }
                    break;
                default:
                    break;
            }

        }

    }

    draw(): void {
        if (this.hoveringOver) {
            switch (this.hoveringOver.type) {
                case 'component':
                    const component = this.cpuDiagram.components.get(this.hoveringOver.id);
                    if (!component) return;
                    this.drawInfoBox(this.mouse.x, this.mouse.y, component.label, component.type, component.description ?? '');
                    break;
                case 'port':
                    const port = this.cpuDiagram.ports.get(this.hoveringOver.id);
                    if (!port) return;
                    let value = port.value instanceof Object ? port.value.value : port.value;

                    this.drawInfoBox(this.mouse.x, this.mouse.y, port.label + ": " + (value).toString(), '', '');
                    break;
                case 'connection':
                    // this.drawInfoBox(this.hoveringOver.x, this.hoveringOver.y, 'Connection', 'Connection', 'This is a connection');
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
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    }

}
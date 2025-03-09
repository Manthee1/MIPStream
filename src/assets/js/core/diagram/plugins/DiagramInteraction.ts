import { SpatialItem } from "../../../utils/SpatialMap";
import { CPUDiagram, CPUDiagramPlugin } from "../CPUDiagram";

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
            this.mouse.lastClick = { x: this.mouse.x * this.scaleX, y: this.mouse.y* this.scaleY };
            this.mouseDown();
        });

        this.cpuDiagram.canvas.addEventListener('mouseup', (e) => {
            this.mouse.isDown = false;
            this.mouseUp();
        });

        document.addEventListener('keydown', (e) => {
            this.keyboard.keys[e.key] = true;
            this.keyDownHandler(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keyboard.keys[e.key] = false;
        });
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


    drawInfoBox(x:number,y:number, title:string, subtitle:string, description:string){
        const ctx = this.cpuDiagram.ctx;
        const padding = 10;
        const titleHeight = 20;
        const subtitleHeight = 15;
        const descriptionHeight = 15;
        const width = 200;
        const height = titleHeight + subtitleHeight + descriptionHeight + padding * 2;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(title, x + padding, y + padding + titleHeight);

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(subtitle, x + padding, y + padding + titleHeight + padding + subtitleHeight);

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(description, x + padding, y + padding + titleHeight + padding + subtitleHeight + padding + descriptionHeight);
    }

    draw(): void {
        if (this.hoveringOver) {
            switch (this.hoveringOver.type) {
                case 'component':
                    const component = this.cpuDiagram.components.get(this.hoveringOver.id);
                    if (!component) return;
                    this.drawInfoBox(this.hoveringOver.x, this.hoveringOver.y, component.label, component.type, component.description??'');
                    break;
                case 'port':
                    const port = this.cpuDiagram.ports.get(this.hoveringOver.id);
                    if (!port) return;
                    this.drawInfoBox(this.hoveringOver.x, this.hoveringOver.y, port.label, port.value, '');
                    break;
                case 'connection':
                    this.drawInfoBox(this.hoveringOver.x, this.hoveringOver.y, 'Connection', 'Connection', 'This is a connection');
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
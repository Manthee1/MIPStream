import { CPUDiagram, CPUDiagramPlugin } from "../CPUDiagram";

export class DiagramEditor extends CPUDiagramPlugin {
    mouse: { x: number, y: number, isDown: boolean, lastClick: { x: number, y: number } } = { x: 0, y: 0, isDown: false, lastClick: { x: 0, y: 0 } };
    keyboard: { keys: { [key: string]: boolean } } = { keys: {} };
    draggingComponent: {
        id: string;
        oldPos: Position;
        prevTMPPos: Position;
    } | null = null;
    draggingComponentPort: {
        componentId: string;
        portName: string;
        oldPos: Position;
        oldLocation: 'top' | 'bottom' | 'left' | 'right';
        relPos: number;
    } | null = null;

    constructor(cpuDiagram: CPUDiagram) {
        super(cpuDiagram);

        this.initializeMouseEvents();

    }

    isKeyDown(key: string) {
        return this.keyboard.keys[key] || false;
    }

    initializeMouseEvents() {

        this.cpuDiagram.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.offsetX
            this.mouse.y = e.offsetY
            this.mouseMove();
        });

        this.cpuDiagram.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.mouse.lastClick = { x: this.mouse.x, y: this.mouse.y };
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

    keyDownHandler(e: KeyboardEvent) {
        switch (e.key) {
            case 's':
                const layout = this.saveConfig();
                console.log(layout);
                break;
            case 'Escape':
                if (this.draggingComponent) {
                    const componentLayout = this.cpuDiagram.layout.components.get(this.draggingComponent.id);
                    if (!componentLayout) return;
                    componentLayout.pos = this.draggingComponent.oldPos;
                    this.cpuDiagram.recalculateComponentPorts(componentLayout);
                    this.draggingComponent = null;
                }
                if (this.draggingComponentPort) {
                    const componentLayout = this.cpuDiagram.layout.components.get(this.draggingComponentPort.componentId);
                    if (!componentLayout) return;
                    const portLayout = componentLayout.ports.get(this.draggingComponentPort.portName);
                    if (!portLayout) return;
                    portLayout.pos = this.draggingComponentPort.oldPos;
                    portLayout.location = this.draggingComponentPort.oldLocation;
                    portLayout.relPos = this.draggingComponentPort.relPos;
                    this.cpuDiagram.recalculateComponentPorts(componentLayout);
                    this.draggingComponentPort = null;
                }
                break;
        }
    }

    mouseMove() {
        const [offsetX, offsetY] = [this.mouse.x - this.mouse.lastClick.x, this.mouse.y - this.mouse.lastClick.y];

        if (this.draggingComponent) {
            const componentLayout = this.cpuDiagram.layout.components.get(this.draggingComponent.id);
            if (!componentLayout) return;
            let [x, y] = this.cpuDiagram.getPos({ x: this.draggingComponent.oldPos.x + offsetX, y: this.draggingComponent.oldPos.y + offsetY }, componentLayout.dimensions);
            // If constrol is pressed, snap to grid
            if (this.isKeyDown('Control')) {
                x = Math.round(x / 10) * 10;
                y = Math.round(y / 10) * 10;
            }
            if (x == this.draggingComponent.prevTMPPos.x && y == this.draggingComponent.prevTMPPos.y) return;
            componentLayout.pos = { x, y };
            this.draggingComponent.prevTMPPos = { x, y }
            this.cpuDiagram.recalculateComponentPorts(componentLayout);
            this.cpuDiagram.draw();
            return;
        }
        if (this.draggingComponentPort) {
            const componentLayout = this.cpuDiagram.layout.components.get(this.draggingComponentPort.componentId);
            if (!componentLayout) return;
            const componentPos = componentLayout.pos;
            const portLayout = componentLayout.ports.get(this.draggingComponentPort.portName);
            if (!portLayout) return;

            // If is inbetween the component X
            this.cpuDiagram.draw();

            if (componentPos.x < this.mouse.x && componentPos.x + componentLayout.dimensions.width > this.mouse.x) {
                // If is above the component
                portLayout.location = (componentPos.y > this.mouse.y) ? 'top' : 'bottom';
            } else if (componentPos.y < this.mouse.y && componentPos.y + componentLayout.dimensions.height > this.mouse.y) {
                // If is to the left of the component
                portLayout.location = (componentPos.x > this.mouse.x) ? 'left' : 'right';
            }

            this.cpuDiagram.draw();

            portLayout.relPos = portLayout.location === 'top' || portLayout.location === 'bottom' ? (this.mouse.x - componentPos.x) / componentLayout.dimensions.width : (this.mouse.y - componentPos.y) / componentLayout.dimensions.height;
            portLayout.relPos = Math.max(0, Math.min(1, portLayout.relPos));
            this.cpuDiagram.recalculateComponentPorts(componentLayout);
            return;
        }
    }

    mouseDown() {
        // Get a component that the mouse is over
        let found = false;
        for (let component of this.cpuDiagram.layout.components.values()) {

            // Check if the mouse is over a port
            for (let port of component.ports.values()) {
                const portPos = port.pos as Position;
                if (!portPos) continue;
                if (this.isOverRect(portPos.x - 10, portPos.y - 5, 20, 10)) {
                    this.draggingComponentPort = { componentId: component.id, portName: port.name, oldPos: portPos, oldLocation: port.location, relPos: port.relPos };
                    found = true;
                    break;
                }
            }
            if (found) break;

            const [x, y] = this.cpuDiagram.getPos(component.pos, component.dimensions);
            if (this.isOverRect(x, y, component.dimensions.width, component.dimensions.height)) {
                this.draggingComponent = { id: component.id, oldPos: { x: x, y: y } };
                found = true;
                break;
            }
        }

        if (!found) {
            this.draggingComponent = null;
        }

    }

    mouseUp() {
        this.draggingComponent = null;
        this.draggingComponentPort = null;


    }




    isOverRect(x: number, y: number, width: number, height: number) {
        return this.mouse.x > x && this.mouse.x < x + width && this.mouse.y > y && this.mouse.y < y + height;
    }

    saveConfig() {
        // Save layout confing by converting it to the original format
        const layout: CPULayout = {
            width: this.cpuDiagram.width,
            height: this.cpuDiagram.height,
            components: [...this.cpuDiagram.layout.components.values()].map((component) => {
                const ports = [...component.ports.values()].map((port) => {
                    return {
                        name: port.name,
                        location: port.location,
                        relPos: port.relPos,
                    } as PortLayout;
                });

                return {
                    id: component.id,
                    dimensions: component.dimensions,
                    pos: { x: component.pos.x, y: component.pos.y },
                    ports
                };
            })
        };

        return layout;
    }


    draw(): void {
        // Draw mose pos text
        this.cpuDiagram.ctx.fillStyle = 'black';
        this.cpuDiagram.ctx.textAlign = 'left';
        this.cpuDiagram.ctx.textBaseline = 'middle';
        this.cpuDiagram.ctx.font = '12px Arial';
        this.cpuDiagram.ctx.fillText(`Mouse: ${this.mouse.x}, ${this.mouse.y}, ${this.mouse.isDown}`, 0, this.cpuDiagram.height - 20);

    }


}
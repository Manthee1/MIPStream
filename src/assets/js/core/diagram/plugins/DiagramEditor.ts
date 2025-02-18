import SpatialMap from "../../../utils/SpatialMap";
import { CPUDiagram, CPUDiagramPlugin } from "../CPUDiagram";

// TODO:
// [] Add ability to connect ports
// [] Add ability to move wires
// [] Add undo/redo

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
    hoveringOverId: string | null = null;

    spatialMap: SpatialMap = new SpatialMap(0, 0, 20);

    constructor(cpuDiagram: CPUDiagram) {
        super(cpuDiagram);


        this.bendConnections();
        this.initializeSpatialMap();
        this.initializeMouseEvents();

    }

    isKeyDown(key: string) {
        return this.keyboard.keys[key] || false;
    }

    initializeSpatialMap() {
        this.spatialMap = new SpatialMap(this.cpuDiagram.width, this.cpuDiagram.height, 20);

        // Insert all the components
        this.cpuDiagram.layout.components.forEach(component => {
            this.spatialMap.insert(component.id, component.pos, component.dimensions);
        });

        // Insert all the wires
        this.cpuDiagram.layout.connections.forEach(connection => {
            const [from, to] = [connection.id.split('-')[0], connection.id.split('-')[1]];
            const fromPort = this.cpuDiagram.getPort(from, 'output');
            const bends = connection.bends;
            const toPort = this.cpuDiagram.getPort(to, 'input');

            const points = [fromPort.pos as Position, ...bends, toPort.pos as Position];


            for (let i = 0; i < points.length - 1; i++) {
                const [from, to] = [points[i], points[i + 1]];
                const [x1, y1, x2, y2] = [from.x - 5, from.y - 5, to.x - 5, to.y - 5];
                const [width, height] = [Math.abs(x1 - x2) + 10, Math.abs(y1 - y2) + 10];

                const [x, y] = [Math.min(x1, x2), Math.min(y1, y2)];
                this.spatialMap.insert(connection.id + '|' + i, { x, y }, { width, height });
            }

        });




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




    bendConnections() {
        // Go thorugh each connection and bend it so that the connection is straight
        for (let connection of this.cpuDiagram.layout.connections.values()) {
            // If not straight bend at the beggining and if output higher then above the first bend, otherwise below
            const [from, to] = [connection.id.split('-')[0], connection.id.split('-')[1]];
            const fromPort = this.cpuDiagram.getPort(from, 'output');
            const toPort = this.cpuDiagram.getPort(to, 'input');

            connection.bends = [];
            let bend = { x: connection.fromPos.x, y: connection.fromPos.y };
            switch (fromPort.location) {
                case 'top':
                    bend.y -= 15;
                    break;
                case 'bottom':
                    bend.y += 15;
                    break;
                case 'left':
                    bend.x -= 15;
                    break;
                case 'right':
                    bend.x += 15;
                    break;
            }
            connection.bends.push(bend);

            if ((fromPort.location === "left" || fromPort.location === "right") == (toPort.location === "left" || toPort.location === "right")) {

                if ((fromPort.location === "left" || fromPort.location === "right")) {
                    bend = { x: connection.bends[0].x, y: connection.toPos.y };
                } else {
                    bend = { x: connection.toPos.x, y: connection.bends[0].y };
                }
                connection.bends.push(bend);
            }
            continue;
        }
        this.cpuDiagram.draw();
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
            case 'g':
                // If ctrl and g was pressed then snap every component to grid
                for (let component of this.cpuDiagram.layout.components.values()) {
                    const componentLayout = this.cpuDiagram.layout.components.get(component.id);
                    if (!componentLayout) continue;
                    componentLayout.pos = { x: Math.round(componentLayout.pos.x / 10) * 10, y: Math.round(componentLayout.pos.y / 10) * 10 };
                    this.cpuDiagram.recalculateComponentPorts(componentLayout);
                }
                this.cpuDiagram.draw();
                break;
            case 'b':
                this.bendConnections();

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
            this.bendConnections();
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


        if (this.hoveringOverId != this.spatialMap.query(this.mouse.x, this.mouse.y)) {
            this.hoveringOverId = this.spatialMap.query(this.mouse.x, this.mouse.y);

            this.cpuDiagram.draw();
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
                this.draggingComponent = { id: component.id, oldPos: { x: x, y: y }, prevTMPPos: { x: x, y: y } }
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
                    ports: []
                };
            }),
            connections: []
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



        if (this.hoveringOverId) {
            const hoveringOverId = this.hoveringOverId;
            // If the hovering over a component, highlight it

            // If the id has '|' it is a wire
            if (hoveringOverId.includes('|')) {
                const [connectionId] = hoveringOverId.split('|');
                const connection = this.cpuDiagram.layout.connections.get(connectionId);
                if (!connection) return;
                const [from, to] = [connection.id.split('-')[0], connection.id.split('-')[1]];
                const fromPort = this.cpuDiagram.getPort(from, 'output');
                const toPort = this.cpuDiagram.getPort(to, 'input');


                this.cpuDiagram.ctx.strokeStyle = 'red';
                this.cpuDiagram.ctx.lineWidth = 2;
                this.cpuDiagram.ctx.beginPath();
                this.cpuDiagram.ctx.moveTo(connection.fromPos.x, connection.fromPos.y);
                for (let bend of connection.bends) {
                    this.cpuDiagram.ctx.lineTo(bend.x, bend.y);
                }
                this.cpuDiagram.ctx.lineTo(connection.toPos.x, connection.toPos.y);
                this.cpuDiagram.ctx.stroke();
                this.cpuDiagram.ctx.strokeStyle = 'black';
                this.cpuDiagram.ctx.lineWidth = 1;
                return;
            }

            const component = this.cpuDiagram.layout.components.get(hoveringOverId);
            if (!component) return;
            const [x, y] = this.cpuDiagram.getPos(component.pos, component.dimensions);
            this.cpuDiagram.ctx.strokeStyle = 'red';
            this.cpuDiagram.ctx.lineWidth = 2;
            this.cpuDiagram.ctx.strokeRect(x, y, component.dimensions.width, component.dimensions.height);
            this.cpuDiagram.ctx.strokeStyle = 'black';
            this.cpuDiagram.ctx.lineWidth = 1;
        }


    }


}
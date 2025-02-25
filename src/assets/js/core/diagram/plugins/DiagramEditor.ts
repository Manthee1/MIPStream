import { clone } from "../../../utils";
import SpatialMap, { SpatialItem } from "../../../utils/SpatialMap";
import { CPUDiagram, CPUDiagramPlugin } from "../CPUDiagram";

// TODO:
// [] Add ability to connect ports
// [] Add ability to move wires
// [] Add undo/redo

export class DiagramEditor extends CPUDiagramPlugin {
    mouse: { x: number, y: number, isDown: boolean, lastClick: { x: number, y: number } } = { x: 0, y: 0, isDown: false, lastClick: { x: 0, y: 0 } };
    keyboard: { keys: { [key: string]: boolean } } = { keys: {} };
    mode: 'connect' | 'move' = 'move';
    draggingComponent: {
        id: string;
        oldPos: Position;
        prevTMPPos: Position;
    } | null = null;
    draggingComponentPort: {
        id: string;
        oldPos: Position;
        oldLocation: 'top' | 'bottom' | 'left' | 'right';
        relPos: number;
    } | null = null;
    draggingConnection: { id: string, bendIndex: number } | null = null;

    newConnectionOriginPort: { id: string } | null = null;
    newConnections: Array<ComponentConnection> = [];

    hoveringOver: SpatialItem | null = null;

    spatialMap: SpatialMap = new SpatialMap(0, 0, 20);

    constructor(cpuDiagram: CPUDiagram) {
        super(cpuDiagram);


        this.bendConnections();
        this.initializeSpatialMap();
        this.initializeMouseEvents();
        console.log(this.spatialMap);

    }

    isKeyDown(key: string) {
        return this.keyboard.keys[key] || false;
    }

    initializeSpatialMap() {
        this.spatialMap = new SpatialMap(this.cpuDiagram.width, this.cpuDiagram.height, 20);

        // Insert all the components
        this.cpuDiagram.components.forEach(component => {
            this.spatialMap.insert(component.id, component.pos, component.dimensions, 'component');

        });

        // Insert all the ports
        this.cpuDiagram.ports.forEach(port => {
            const [x, y] = [port.pos?.x, port.pos?.y];
            if (!x || !y) return;

            this.spatialMap.insert(port.id, { x: x - 10, y: y - 5 }, { width: 20, height: 10 }, 'port');
        });

        // Insert all the connections
        let connectionId = 0;
        this.cpuDiagram.connections.forEach(connection => {
            const points = this.cpuDiagram.getConnectionPoints(connection);

            for (let i = 0; i < points.length - 1; i++) {
                const [from, to] = [points[i], points[i + 1]];
                const [x1, y1, x2, y2] = [from.x - 5, from.y - 5, to.x - 5, to.y - 5];
                const [width, height] = [Math.abs(x1 - x2) + 10, Math.abs(y1 - y2) + 10];

                const [x, y] = [Math.min(x1, x2), Math.min(y1, y2)];
                this.spatialMap.insert(connectionId.toString(), { x, y }, { width, height }, 'connection');
                connectionId++;
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
        for (let connection of this.cpuDiagram.connections.values()) {
            // If not straight bend at the beggining and if output higher then above the first bend, otherwise below
            const [from, to] = [connection.from, connection.to];
            const fromPort = this.cpuDiagram.ports.get(from);
            const toPort = this.cpuDiagram.ports.get(to);
            if (!fromPort || !toPort || !connection.fromPos || !connection.toPos) continue;

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

            // Add the last bend a little bit off of the to port
            bend = { x: connection.toPos.x, y: connection.toPos.y };
            switch (toPort.location) {
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
            continue;
        }
        this.cpuDiagram.draw();
    }

    keyDownHandler(e: KeyboardEvent) {
        switch (e.key) {
            case 'c':
                this.mode = 'connect';
                this.cpuDiagram.draw();
                break;
            case 'm':
                this.mode = 'move';
                this.cpuDiagram.draw();
                break;
            case 's':
                const layout = this.saveConfig();
                console.log(layout);
                break;
            case 'R':
                // Reset the layout
                localStorage.removeItem('layout');
                break;
            case 'Escape':
                if (this.draggingComponent) {
                    const componentLayout = this.cpuDiagram.components.get(this.draggingComponent.id);
                    if (!componentLayout) return;
                    componentLayout.pos = this.draggingComponent.oldPos;
                    this.recalculateComponentPorts(componentLayout);
                    this.draggingComponent = null;
                }
                if (this.draggingComponentPort) {
                    const componentLayout = this.cpuDiagram.components.get(this.draggingComponentPort.id.split('.')[0]);
                    if (!componentLayout) return;
                    const portLayout = this.cpuDiagram.ports.get(this.draggingComponentPort.id);
                    if (!portLayout) return;
                    portLayout.pos = this.draggingComponentPort.oldPos;
                    portLayout.location = this.draggingComponentPort.oldLocation;
                    portLayout.relPos = this.draggingComponentPort.relPos;
                    this.recalculateComponentPorts(componentLayout);
                    this.draggingComponentPort = null;
                }
                break;
            case 'g':
                // If ctrl and g was pressed then snap every component to grid
                for (let component of this.cpuDiagram.components.values()) {
                    const componentLayout = this.cpuDiagram.components.get(component.id);
                    if (!componentLayout) continue;
                    componentLayout.pos = { x: Math.round(componentLayout.pos.x / 10) * 10, y: Math.round(componentLayout.pos.y / 10) * 10 };
                    this.recalculateComponentPorts(componentLayout);
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

        if (this.newConnectionOriginPort) {
            this.cpuDiagram.draw();
        }

        if (this.hoveringOver != this.spatialMap.query(this.mouse.x, this.mouse.y)) {
            this.hoveringOver = this.spatialMap.query(this.mouse.x, this.mouse.y);
            console.log(this.hoveringOver);

            this.cpuDiagram.draw();
        }

        if (this.draggingComponent) {
            const componentLayout = this.cpuDiagram.components.get(this.draggingComponent.id);
            if (!componentLayout) return;
            let [x, y] = [this.draggingComponent.oldPos.x + offsetX, this.draggingComponent.oldPos.y + offsetY];
            // If control is pressed, snap to grid
            if (this.isKeyDown('Control')) {
                x = Math.round(x / 10) * 10;
                y = Math.round(y / 10) * 10;
            }
            if (x == this.draggingComponent.prevTMPPos.x && y == this.draggingComponent.prevTMPPos.y) return;
            componentLayout.pos = { x, y };
            this.draggingComponent.prevTMPPos = { x, y }
            this.recalculateComponentPorts(componentLayout);
            this.spatialMap.update(this.draggingComponent.id, { x, y }, {}, 'component');
            this.cpuDiagram.draw();
            return;
        }
        if (this.draggingComponentPort) {
            const componentLayout = this.cpuDiagram.components.get(this.draggingComponentPort.id.split('.')[0]);
            if (!componentLayout) return;
            console.log(componentLayout);
            const componentPos = componentLayout.pos;
            const portLayout = this.cpuDiagram.ports.get(this.draggingComponentPort.id);
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
            this.recalculateComponentPorts(componentLayout);
            this.spatialMap.update(this.draggingComponentPort.id, { x: this.mouse.x - 10, y: this.mouse.y - 5 }, { width: 20, height: 10 }, 'port');
            return;
        }
        if (this.draggingConnection) {
            // Move the connection
            const connection = this.cpuDiagram.connections.get(parseInt(this.draggingConnection.id));
            if (!connection) return;

            // Only move the connection either horizontally or vertically depending on if the connection is horizontal or vertical
            const [x, y] = [this.mouse.x, this.mouse.y];
            const bendIndex = this.draggingConnection.bendIndex - 2;
            console.log(bendIndex);

            const isHorizontal = connection.bends[bendIndex].y === connection.bends[bendIndex + 1].y;
            if (isHorizontal) {
                // Only update the y of both bends
                connection.bends[bendIndex + 1].y = y;
                connection.bends[bendIndex].y = y;
            } else {
                // Only update the x of both bends
                connection.bends[bendIndex + 1].x = x;
                connection.bends[bendIndex].x = x;
            }

            const points = this.cpuDiagram.getConnectionPoints(connection);
            for (let i = 0; i < points.length - 1; i++) {
                const [from, to] = [points[i], points[i + 1]];
                const [x1, y1, x2, y2] = [from.x - 5, from.y - 5, to.x - 5, to.y - 5];
                const [width, height] = [Math.abs(x1 - x2) + 10, Math.abs(y1 - y2) + 10];

                const [x, y] = [Math.min(x1, x2), Math.min(y1, y2)];
                this.spatialMap.update(connection.id + '|' + i, { x, y }, { width, height }, 'connection');
            }

            this.cpuDiagram.draw();

            return;

        }









    }

    mouseDown() {
        // Get a component that the mouse is over
        if (!this.hoveringOver) return;

        // If the hovering over a component, set it as dragging
        if (this.hoveringOver.type == 'component') {
            const component = this.cpuDiagram.components.get(this.hoveringOver.id);
            if (!component) return;

            const { x, y } = component.pos;
            this.draggingComponent = { id: component.id, oldPos: { x: x, y: y }, prevTMPPos: { x: x, y: y } }
        } else if (this.hoveringOver.type == 'connection') {
            // Get the bend index
            const [connectionId, bendIndex] = this.hoveringOver.id.split('|');
            this.draggingConnection = { id: connectionId, bendIndex: parseInt(bendIndex) };
        } else if (this.hoveringOver.type == 'port') {
            const portId = this.hoveringOver.id
            const [componentId, portName] = portId.split('.');
            if (!componentId || !portName) return

            const component = this.cpuDiagram.components.get(componentId);
            if (!component) return;

            const port = this.cpuDiagram.ports.get(portId);
            if (!port) return;


            if (this.mode == 'connect') {
                this.newConnectionOriginPort = { id: portId };
            } else if (this.mode == 'move') {
                this.draggingComponentPort = {
                    id: portId,
                    oldPos: port.pos as Position ?? { x: 0, y: 0 },
                    oldLocation: port.location,
                    relPos: port.relPos
                };
            }

            console.log(this.draggingComponentPort);

        }




    }

    mouseUp() {
        this.draggingComponent = null;
        this.draggingComponentPort = null;
        this.draggingConnection = null;

        this.handleNewConnection();


        this.newConnectionOriginPort = null;




    }

    handleNewConnection() {
        if (this.newConnectionOriginPort && this.hoveringOver?.type == 'port') {

            const fromPort = this.cpuDiagram.ports.get(this.newConnectionOriginPort.id);
            if (!fromPort) return;
            const toPortId = this.hoveringOver.id;
            const toPort = this.cpuDiagram.ports.get(toPortId);
            if (!toPort || fromPort.type == toPort.type) return;



            const [highBits, lowBits] = [Math.max(fromPort.bits, toPort.bits) - 1, 0];

            let newId = this.cpuDiagram.connections.size;;
            while (newId++ in this.cpuDiagram.connections) {
                // A hardcode limit of 1000 connections in case of infinite loop
                if (newId > 1000) break;
            }

            this.cpuDiagram.connections.set(
                newId, {
                id: newId,
                from: this.newConnectionOriginPort.id,
                to: toPortId,
                type: 'data',
                bitRange: [lowBits, highBits],
                bends: [],
                fromPos: { x: 0, y: 0 },
                toPos: { x: 0, y: 0 }
            }
            );

            console.log(this.cpuDiagram.connections);


            // this.newConnections.push({
            //     bitRange: [highBits, lowBits],
            //     from: this.newConnectionOriginPort.id,
            //     to: toPortId,
            // });
            // console.log(JSON.stringify(this.newConnections));

        }
    }

    recalculateComponentPorts(componentLayout: ComponentLayout) {
        componentLayout?.ports?.forEach((port) => {
            const portLayout = port;
            const { x, y } = this.cpuDiagram.getAbsolutePortPosition(portLayout, componentLayout);
            portLayout.pos = { x, y };
        });

        // Recalculate connection positions
        this.recalculateConnectionPositions();
    }

    recalculateConnectionPositions() {
        this.cpuDiagram.connections.forEach((connectionLayout) => {

            const fromPort = this.cpuDiagram.ports.get(connectionLayout.from);
            const toPort = this.cpuDiagram.ports.get(connectionLayout.to);
            if (!fromPort || !toPort) return;
            connectionLayout.fromPos = fromPort.pos as Position;
            connectionLayout.toPos = toPort.pos as Position;
        });
    }


    isOverRect(x: number, y: number, width: number, height: number) {
        return this.mouse.x > x && this.mouse.x < x + width && this.mouse.y > y && this.mouse.y < y + height;
    }

    saveConfig() {

        // Save layout confing by converting it to the original format
        const layout = {
            width: this.cpuDiagram.width,
            height: this.cpuDiagram.height,

            components: Array.from(this.cpuDiagram.components.values()),
            ports: Array.from(this.cpuDiagram.ports.values()),
            connections: Array.from(this.cpuDiagram.connections.values())
        };

        // Save the layout to localStorage
        localStorage.setItem('layout', JSON.stringify(layout));


        return layout;
    }


    draw(): void {
        // Draw mose pos text
        this.cpuDiagram.ctx.fillStyle = 'black';
        this.cpuDiagram.ctx.textAlign = 'left';
        this.cpuDiagram.ctx.textBaseline = 'middle';
        this.cpuDiagram.ctx.font = '12px Arial';
        this.cpuDiagram.ctx.fillText(`${this.mode}`, 0, this.cpuDiagram.height - 40);
        this.cpuDiagram.ctx.fillText(`Mouse: ${this.mouse.x}, ${this.mouse.y}, ${this.mouse.isDown}`, 0, this.cpuDiagram.height - 20);





        // if a a new connection is being made
        if (this.newConnectionOriginPort) {
            // Origin position

            const port = this.cpuDiagram.ports.get(this.newConnectionOriginPort.id);
            if (!port || !port.pos) return;
            const { x: x1, y: y1 } = port.pos;

            console.log("Drawing new connection");


            // If hovering over a port, draw a line from the port to the mouse
            let [x2, y2] = [this.mouse.x, this.mouse.y];
            let toPortType: null | 'input' | 'output' = null;
            if (this.hoveringOver?.type === 'port') {
                toPortType = this.hoveringOver.id.split('|')[2] as 'input' | 'output';
                if (port.type != toPortType)
                    [x2, y2] = [this.hoveringOver.x + 10, this.hoveringOver.y + 5];
            }

            this.cpuDiagram.ctx.beginPath();
            this.cpuDiagram.ctx.moveTo(x1, y1);
            this.cpuDiagram.ctx.lineTo(x2, y2);
            this.cpuDiagram.ctx.stroke();
            this.cpuDiagram.ctx.closePath();

            // Highlight the port
            this.cpuDiagram.ctx.lineWidth = 2;
            this.cpuDiagram.ctx.strokeStyle = 'green';
            this.cpuDiagram.ctx.strokeRect(x1 - 10, y1 - 5, 20, 10);
            if (this.hoveringOver?.type === 'port' && port.type != toPortType) {
                this.cpuDiagram.ctx.strokeStyle = 'red';
                this.cpuDiagram.ctx.strokeRect(x2 - 10, y2 - 5, 20, 10);
            }
            this.cpuDiagram.ctx.strokeStyle = 'black';
            this.cpuDiagram.ctx.lineWidth = 1;




            return;
        }

        if (!this.hoveringOver) return;
        const hoveringOver = this.hoveringOver;

        // If the hovering over a component, highlight it

        // If the id has '|' it is a connection
        if (hoveringOver.type === 'connection') {
            const [connectionId, bendIndex] = hoveringOver.id.split('|');
            const connection = this.cpuDiagram.connections.get(parseInt(connectionId));
            if (!connection) return;



            this.cpuDiagram.ctx.strokeStyle = 'red';
            this.cpuDiagram.drawConnection(connection);
            this.cpuDiagram.ctx.strokeStyle = 'blue';
            this.cpuDiagram.ctx.lineWidth = 1;

            // Highlight the closest bend position
            let index = parseInt(bendIndex) - 1;
            if (index > 0) {
                const [x1, y1, x2, y2] = [connection.bends[index - 1].x, connection.bends[index - 1].y, connection.bends[index].x, connection.bends[index].y];
                const [width, height] = [Math.abs(x1 - x2), Math.abs(y1 - y2)];
                const [x, y] = [Math.min(x1, x2), Math.min(y1, y2)];
                this.cpuDiagram.ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
            }

            return;
        }
        if (hoveringOver.type === 'component') {
            const component = this.cpuDiagram.components.get(hoveringOver.id);
            if (!component) return;
            const { x, y } = component.pos;
            this.cpuDiagram.ctx.strokeStyle = 'red';
            this.cpuDiagram.ctx.lineWidth = 2;
            this.cpuDiagram.ctx.strokeRect(x, y, component.dimensions.width, component.dimensions.height);
            this.cpuDiagram.ctx.strokeStyle = 'black';
            this.cpuDiagram.ctx.lineWidth = 1;
            return;
        }
        if (hoveringOver.type === 'port') {
            const portId = hoveringOver.id;
            const [componentId, portName] = portId.split('.');
            const component = this.cpuDiagram.components.get(componentId);
            if (!component) return;
            const port = this.cpuDiagram.ports.get(portId);
            if (!port || !port.pos) return;

            const { x, y } = port.pos
            this.cpuDiagram.ctx.strokeStyle = 'red';
            this.cpuDiagram.ctx.lineWidth = 2;
            this.cpuDiagram.ctx.strokeRect(x - 10, y - 5, 20, 10);
            this.cpuDiagram.ctx.strokeStyle = 'black';
            this.cpuDiagram.ctx.lineWidth = 1;

            return;
        }





    }


}
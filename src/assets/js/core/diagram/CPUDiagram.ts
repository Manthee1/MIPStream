import SpatialMap from "../../utils/SpatialMap";

export class CPUDiagramPlugin {
    cpuDiagram: CPUDiagram;

    constructor(cpuDiagram: CPUDiagram) {
        this.cpuDiagram = cpuDiagram;
    }

    draw() {

    }
}


export class CPUDiagram {

    width: number = 0;
    height: number = 0;

    components: Map<string, ComponentLayout> = new Map();
    ports: Map<string, PortLayout> = new Map();
    connections: Map<number, ConnectionLayout> = new Map();

    canvas: HTMLCanvasElement = null as any;
    ctx: CanvasRenderingContext2D = null as any;

    drawIntervalRefence: NodeJS.Timeout = null as any;
    plugins: Array<typeof CPUDiagramPlugin> = [];
    pluginInstances: CPUDiagramPlugin[] = [];

    spatialMap: SpatialMap = new SpatialMap(0, 0, 20);


    worker: Worker = null as any;


    constructor(selector: string, layout: CPULayout, plugins: Array<typeof CPUDiagramPlugin> = []) {
        this.plugins = plugins;

        // Map the layout to a more efficient structure



        try {
            this.mountCanvas(selector);

            this.init(layout);
        } catch (e) {
            console.error('Error initializing diagram');
            console.error(e);
        }

        // this.drawIntervalRefence = setInterval(() => {
        this.draw();
        // }, 1000 / 60);

        console.log('Diagram', this);
    }

    mountCanvas(selector: string) {
        const canvas = document.querySelector(selector);
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        this.canvas = canvas as HTMLCanvasElement;

    }

    init(layout: CPULayout) {
        // Get the canvas context
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not found');
        this.ctx = ctx;

        // Set the canvas size to the layout size
        this.canvas.width = this.width = layout.width;
        this.canvas.height = this.height = layout.height;
        // this.canvas.style.width = this.width + 'px';
        // this.canvas.style.height = this.height + 'px';


        // Load the layout from localStorage
        const layoutSaved = localStorage.getItem('layout');
        if (layoutSaved) {
            const parsedLayout = JSON.parse(layoutSaved);
            layout.components = parsedLayout.components.map((component: any) => {
                const layoutComponent = layout.components.find((layoutComponent) => layoutComponent.id === component.id);
                if (!layoutComponent) throw new Error(`Component ${component.id} not found in layout`);
                return { ...layoutComponent, ...component, ...{ ports: layoutComponent.ports } };
            });
            layout.connections = parsedLayout.connections;
            // layout.ports = parsedLayout.ports;
            console.log('Loaded layout from localStorage', this.components, this.connections, this.ports);
        }

        this.initializeComponents(layout); // Also initializez the ports
        console.log('Initialized components', this.components, this.ports);
        this.initializeConnections(layout);

        this.initializeSpatialMap();

        this.initializePlugins();
    }

    private initializeComponents(layout: CPULayout) {

        // Add components in the layout
        layout.components.forEach((component) => {
            // Check if the component is already in the layout
            if (this.components.get(component.id)) throw new Error(`Component ${component.id} already in layout`);

            this.components.set(component.id, component);
        });
        if (layout.ports) {
            layout.ports.forEach((port) => {
                // Check if the port is already in the layout
                if (this.ports.get(port.id)) throw new Error(`Port ${port.id} already in layout`);

                this.ports.set(port.id, port);
            });
            return;
        }

        // Add all the ports to the components
        this.components.forEach((component, componentId) => {

            if (!component.ports) return;
            for (let port of component.ports) {
                const newPortId = `${componentId}.${port.id}`;
                const newPort = { ...port, id: newPortId };
                if (this.ports.get(newPortId)) throw new Error(`Port ${newPortId} already in layout`);

                // Make sure the position is smaller or equal to 1
                if (newPort.relPos > 1) {
                    console.warn(`Port position for ${port.id} in ${componentId} is greater than 1. Setting to 1`);
                    newPort.relPos = 1;
                }

                // Set an absolute position for the port
                const { x, y } = this.getAbsolutePortPosition(newPort, component);
                newPort.pos = { x, y };
                newPort.id = newPortId;
                this.ports.set(newPortId, newPort);

            }
        });
    }

    initializeConnections(layout: CPULayout) {

        // Add missing connections
        layout.connections.forEach((connection, index) => {

            if (!this.ports.get(connection.from))
                throw new Error(`Port ${connection.from} not found`);

            if (!this.ports.get(connection.to))
                throw new Error(`Port ${connection.to} not found`);


            connection.fromPos = this.ports.get(connection.from)?.pos
            connection.toPos = this.ports.get(connection.to)?.pos
            connection.id = index;

            // Add the connection
            this.connections.set(index, connection);
        });

    }

    initializeSpatialMap() {
        this.spatialMap = new SpatialMap(this.width, this.height, 20);

        // Insert all the components
        this.components.forEach(component => {
            this.spatialMap.insert(component.id, component.pos, component.dimensions, 'component');

        });

        // Insert all the ports
        this.ports.forEach(port => {
            const [x, y] = [port.pos?.x, port.pos?.y];
            if (!x || !y) return;

            this.spatialMap.insert(port.id, { x: x - 10, y: y - 5 }, { width: 20, height: 10 }, 'port');
        });

        // Insert all the connections
        let connectionId = 0;
        this.connections.forEach(connection => {
            const points = this.getConnectionPoints(connection);

            for (let i = 0; i < points.length - 1; i++) {
                const [from, to] = [points[i], points[i + 1]];
                const [x1, y1, x2, y2] = [from.x - 5, from.y - 5, to.x - 5, to.y - 5];
                const [width, height] = [Math.abs(x1 - x2) + 10, Math.abs(y1 - y2) + 10];

                const [x, y] = [Math.min(x1, x2), Math.min(y1, y2)];
                this.spatialMap.insert(connectionId.toString() + '|' + i, { x, y }, { width, height }, 'connection');
            }
            connectionId++;
        });


    }

    private initializePlugins() {
        // Initialize plugins
        this.plugins.forEach((plugin) => {
            this.pluginInstances.push(new plugin(this));
        });
    }

    drawRect(x: number, y: number, width: number, height: number, fillStyle: string, strokeStyle: string) {
        this.ctx.fillStyle = fillStyle;
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
    }

    drawRectCenter(x: number, y: number, width: number, height: number, fillStyle: string, strokeStyle: string) {
        this.ctx.fillStyle = fillStyle;
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
        this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    }

    drawText(text: string, x: number, y: number, fillStyle: string, font: string, textAlign: CanvasTextAlign = 'center', textBaseline: CanvasTextBaseline = 'middle') {
        this.ctx.fillStyle = fillStyle;
        this.ctx.font = font;
        this.ctx.textAlign = textAlign;
        this.ctx.textBaseline = textBaseline;
        this.ctx.fillText(text, x, y);
    }






    drawComponent(componentLayout: ComponentLayout) {
        // Draw the component
        let [x, y] = [componentLayout.pos.x, componentLayout.pos.y];
        // [x, y] = [x + componentLayout.dimensions.width, y + componentLayout.dimensions.height];
        const width = componentLayout.dimensions.width;
        const height = componentLayout.dimensions.height;


        switch (componentLayout.type) {
            case "and":

                // Draw the and gate
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + width * (3 / 4), y);
                // make a rectangle with right hlaf rounded to a circle
                this.ctx.arcTo(x + width, y, x + width, y + height, height / 2);
                this.ctx.arcTo(x + width, y + height, x + width * (3 / 4), y + height, height / 2);

                this.ctx.lineTo(x, y + height);
                this.ctx.lineTo(x, y);

                this.ctx.closePath();
                this.ctx.stroke();
                break;
            case 'adder':
            case 'alu':
                // Draw the standard ALU 'carret' chape
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);

                const cutSize = width / 1.5

                this.ctx.lineTo(x + width, y + height / 2 - width / 3);
                this.ctx.lineTo(x + width, y + height / 2 + width / 3);
                this.ctx.lineTo(x, y + height);

                this.ctx.lineTo(x, y + height - cutSize);
                this.ctx.lineTo(x + width - cutSize, y + height / 2);
                this.ctx.lineTo(x, y + cutSize);



                this.ctx.closePath();
                this.ctx.stroke();
                break;
            case 'shift':
            case 'sign_extend':
                // Draw A ellipse with dashed borders
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                break;
            case 'mux':
                // Draw a rectanlge with rounded corners
                this.ctx.roundRect(x, y, width, height, 10);
                this.ctx.stroke();
                break;
            case 'const':
                // this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '12px Arial');
                break;

            default:
                // Draw the component
                this.drawRect(x, y, width, height, 'white', 'black');
                break;
        }



        // Add the name to the center of the component
        this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '12px Arial');
    }

    getAbsolutePortPosition(portLayout: PortLayout, componentLayout: ComponentLayout) {
        let [x, y] = [componentLayout.pos.x, componentLayout.pos.y];

        switch (portLayout.location) {
            case 'top':
                x += portLayout.relPos * componentLayout.dimensions.width;
                break;
            case 'bottom':
                x += portLayout.relPos * componentLayout.dimensions.width;
                y += componentLayout.dimensions.height;
                break;
            case 'left':
                y += portLayout.relPos * componentLayout.dimensions.height;
                break;
            case 'right':
                x += componentLayout.dimensions.width;
                y += portLayout.relPos * componentLayout.dimensions.height;
                break;
        }
        return { x, y };
    }


    public getConnectionPoints(connectionLayout: ConnectionLayout) {
        // Get the from and to port layouts
        const fromPort = this.ports.get(connectionLayout.from) as PortLayout;
        const toPort = this.ports.get(connectionLayout.to) as PortLayout;

        // Get the from and to port positions
        const fromPortPos = fromPort.pos as Position;
        const toPortPos = toPort.pos as Position;

        // Adda offset so that the port has a bit of space between the connection
        const offset = 15;
        let offsetPointFrom = { x: fromPortPos.x, y: fromPortPos.y };
        switch (fromPort.location) {
            case 'top': offsetPointFrom.y -= offset; break;
            case 'bottom': offsetPointFrom.y += offset; break;
            case 'left': offsetPointFrom.x -= offset; break;
            case 'right': offsetPointFrom.x += offset; break;
            default: break;
        }

        let offsetPointTo = { x: toPortPos.x, y: toPortPos.y };
        switch (toPort.location) {
            case 'top': offsetPointTo.y -= offset; break;
            case 'bottom': offsetPointTo.y += offset; break;
            case 'left': offsetPointTo.x -= offset; break;
            case 'right': offsetPointTo.x += offset; break;
            default: break;
        }


        return [fromPortPos, offsetPointFrom, ...connectionLayout.bends, offsetPointTo, toPortPos];
    }

    drawPort(port: PortLayout) {
        const { x, y } = port.pos as Position;
        const width = 20;
        const height = 12;

        // this.drawRectCenter(x, y, width, height, 'white', 'black');

        // Add the name to the center of the component

        const value = ((typeof port.value === 'object') ? port.value._value : port.value).toString() ?? '';
        this.drawText(value, x, y, 'black', '12px Arial', 'center', 'middle');
    }

    drawConnection(connectionLayout: ConnectionLayout) {
        const pathPoints = this.getConnectionPoints(connectionLayout);

        this.ctx.beginPath();

        if (connectionLayout.type === 'data') {
            this.ctx.strokeStyle = 'black';
        } else {
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = 'red';
        }
        // Get the from port value
        const fromPort = this.ports.get(connectionLayout.from) as PortLayout;
        const fromPortValue = ((typeof fromPort.value === 'object') ? fromPort.value.value : fromPort.value) as number;
        this.ctx.globalAlpha = fromPortValue == 0 ? 0.5 : 1;


        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        pathPoints.forEach((point) => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1;


        // // Draw the bit range
        // const bitRangeText = `${bitRange[0]}-${bitRange[1]}`;
        // const textX = (fromPortPos.x + toPortPos.x) / 2;
        // const textY = (fromPortPos.y + toPortPos.y) / 2;
        // this.drawText(bitRangeText, textX, textY, 'black', '12px Arial', 'center', 'middle');
    }

    draw() {

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the components
        this.components.forEach((component) => {
            this.drawComponent(component);
        });
        // Draw the connections
        this.ctx.strokeStyle = 'black';
        this.connections.forEach((connection) => {
            this.drawConnection(connection);
        });
        // Draw the ports
        this.ports.forEach((port) => {
            this.drawPort(port);
        });



        // Draw plugins
        this.pluginInstances.forEach((plugin) => {
            plugin.draw();
        });
    }


    destroy() {
        clearInterval(this.drawIntervalRefence);
    }

}



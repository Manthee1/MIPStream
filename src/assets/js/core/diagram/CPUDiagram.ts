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

    worker: Worker = null as any;


    constructor(selector: string, layout: CPULayout, plugins: Array<typeof CPUDiagramPlugin> = []) {
        this.plugins = plugins;

        // Map the layout to a more efficient structure

        // // Load the layout from localStorage
        // const layoutSaved = localStorage.getItem('layout');
        // if (layoutSaved) {
        //     layout = JSON.parse(layoutSaved);
        // }


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
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.initializeComponents(layout); // Also initializez the ports
        this.initializeConnections(layout);
        console.log('Ports', this.ports);
        this.initializePlugins();



    }

    private initializeComponents(layout: CPULayout) {

        // Add components in the layout
        layout.components.forEach((component) => {
            // Check if the component is already in the layout
            if (this.components.get(component.id)) throw new Error(`Component ${component.id} already in layout`);

            this.components.set(component.id, component);
        });

        // Add all the ports to the components
        this.components.forEach((component, componentId) => {

            if (!component.ports) return;
            for (let port of component.ports) {
                const newPortId = `${componentId}.${port.id}`;
                if (this.ports.get(newPortId)) throw new Error(`Port ${newPortId} already in layout`);

                // Make sure the position is smaller or equal to 1
                if (port.relPos > 1) {
                    console.warn(`Port position for ${port.id} in ${componentId} is greater than 1. Setting to 1`);
                    port.relPos = 1;
                }

                // Set an absolute position for the port
                const { x, y } = this.getAbsolutePortPosition(port, component);
                port.pos = { x, y };
                this.ports.set(newPortId, port);

            }
        });
    }

    initializeConnections(layout: CPULayout) {

        // Add missing connections
        layout.connections.forEach((connection, index) => {

            if (this.ports.get(connection.from))
                throw new Error(`Port ${connection.from} not found`);

            if (this.ports.get(connection.to))
                throw new Error(`Port ${connection.to} not found`);


            connection.fromPos = this.ports.get(connection.from)?.pos
            connection.toPos = this.ports.get(connection.to)?.pos

            // Add the connection
            this.connections.set(index, connection);
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
        // Get the component layout


        // Draw the component
        let [x, y] = [componentLayout.pos.x, componentLayout.pos.y];
        // [x, y] = [x + componentLayout.dimensions.width, y + componentLayout.dimensions.height];
        const width = componentLayout.dimensions.width;
        const height = componentLayout.dimensions.height;


        // Draw the component
        this.drawRect(x, y, width, height, 'white', 'black');

        // Add the name to the center of the component
        this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '12px Arial');
    }

    getAbsolutePortPosition(port: PortLayout, componentLayout: ComponentLayout) {
        let [x, y] = [componentLayout.pos.x, componentLayout.pos.y];

        switch (port.location) {
            case 'top':
                x += port.relPos * componentLayout.dimensions.width;
                break;
            case 'bottom':
                x += port.relPos * componentLayout.dimensions.width;
                y += componentLayout.dimensions.height;
                break;
            case 'left':
                y += port.relPos * componentLayout.dimensions.height;
                break;
            case 'right':
                x += componentLayout.dimensions.width;
                y += port.relPos * componentLayout.dimensions.height;
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
        const width = 10;
        const height = 10;

        this.drawRectCenter(x, y, width, height, 'white', 'black');

        // Add the name to the center of the component
        this.drawText(port.label, x, y, 'black', '12px Arial', 'center', 'middle');
    }

    drawConnection(connectionLayout: ConnectionLayout) {
        const pathPoints = this.getConnectionPoints(connectionLayout);

        this.ctx.beginPath();

        if (connectionLayout.type === 'data') {
            this.ctx.strokeStyle = 'black';
        } else {
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeStyle = 'gray';
        }

        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        pathPoints.forEach((point) => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();

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

        // Draw the ports
        this.ports.forEach((port) => {
            this.drawPort(port);
        });

        // Draw the connections
        this.ctx.strokeStyle = 'black';
        this.connections.forEach((connection) => {
            this.drawConnection(connection);
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



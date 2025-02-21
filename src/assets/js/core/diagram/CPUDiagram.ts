import { ComponentBase } from "../components/ComponentBase";

export class CPUDiagramPlugin {
    cpuDiagram: CPUDiagram;

    constructor(cpuDiagram: CPUDiagram) {
        this.cpuDiagram = cpuDiagram;
    }

    draw() {

    }
}


export class CPUDiagram {
    cpuConfig: CPUConfigMapped;
    layout: CPULayoutMapped = null as any;
    canvas: HTMLCanvasElement = null as any;
    ctx: CanvasRenderingContext2D = null as any;
    worker: Worker = null as any;
    drawIntervalRefence: NodeJS.Timeout = null as any;
    plugins: Array<typeof CPUDiagramPlugin> = [];
    pluginInstances: CPUDiagramPlugin[] = [];




    get height() {
        return this.layout.height;
    }

    get width() {
        return this.layout.width;
    }




    constructor(selector: string, cpuConfig: CPUConfigMapped, layout: CPULayout, plugins: Array<typeof CPUDiagramPlugin> = []) {
        this.cpuConfig = cpuConfig;
        this.plugins = plugins;

        // Map the layout to a more efficient structure

        // Load the layout from localStorage
        const layoutSaved = localStorage.getItem('layout');
        if (layoutSaved) {
            layout = JSON.parse(layoutSaved);
        }


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

        this.layout = {
            width: layout.width,
            height: layout.height,
            components: new Map(),
            connections: new Map(),
        };

        // Set the canvas size to the layout size
        this.canvas.width = this.layout.width;
        this.canvas.height = this.layout.height;
        this.canvas.style.width = this.layout.width + 'px';
        this.canvas.style.height = this.layout.height + 'px';

        this.initializeComponents(layout);
        this.initializeConnections(layout);
        this.initializePlugins();



    }

    getPos(pos: CanvasPoint, dimensions?: Dimensions): [number, number] {
        let x = pos.x === 'center' ? (this.canvas.width - (dimensions?.width ?? 0)) / 2 : pos.x;
        let y = pos.y === 'center' ? (this.canvas.height - (dimensions?.height ?? 0)) / 2 : pos.y;
        return [x, y];
    }

    getPortPrefix(type: 'input' | 'output') {
        return type === 'input' ? 'in_' : 'out_';
    }

    private initializeComponents(layout: CPULayout) {

        // Add components in the layout
        layout.components.forEach((component) => {
            const componentConfig = this.cpuConfig.components.get(component.id);
            if (!componentConfig) throw new Error(`Component config not found for ${component.id}`);
            // Check if the component is already in the layout
            if (this.layout.components.get(component.id)) throw new Error(`Component ${component.id} already in layout`);

            const pos = this.getPos(component.pos, component.dimensions);
            this.layout.components.set(component.id, {
                id: component.id,
                dimensions: component.dimensions,
                pos: { x: pos[0], y: pos[1] },
                ports: new Map(),
            });
        });

        // Find components not in the layout and add them
        this.cpuConfig.components.forEach((component, componentId) => {
            if (this.layout.components.get(componentId)) return;
            const dimensions = { width: 100, height: 100 };
            const [x, y] = this.getPos({ x: 'center', y: 'center' }, dimensions);
            this.layout.components.set(componentId, {
                id: componentId,
                dimensions: dimensions,
                pos: { x, y },
                ports: new Map(),
            });
        });


        // Add all the ports to the components
        this.layout.components.forEach((component, componentId) => {
            const componentConfig = this.cpuConfig.components.get(componentId) as ComponentBase;
            if (!componentConfig) throw new Error(`Component config not found for ${componentId}`);

            const unmappedLayoutComponent = layout.components.find((c) => c.id === componentId)
            if (!unmappedLayoutComponent) throw new Error(`Component layout not found for ${componentId}`);

            const processPortLayout = (ports: Port[], type: 'input' | 'output') => {
                for (let port of ports) {

                    let portLayoutIndex = unmappedLayoutComponent.ports?.findIndex((p) => p.name === port.name) ?? -1;
                    // Remove the port from the layout
                    if (portLayoutIndex >= 0) {
                        unmappedLayoutComponent.ports?.splice(portLayoutIndex, 1);
                        console.log('Removed port from layout', port.name);

                    }

                    let portLayout = unmappedLayoutComponent.ports?.[portLayoutIndex];

                    if (!portLayout) {

                        // Check if the component config has a port layout
                        portLayoutIndex = componentConfig.portsLayout.findIndex((p) => p.name === port.name);
                        if (portLayoutIndex >= 0) {
                            portLayout = componentConfig.portsLayout[portLayoutIndex];
                            componentConfig.portsLayout.splice(portLayoutIndex, 1);
                        }
                        if (!portLayout) {
                            portLayout = {
                                name: port.name,
                                location: 'right',
                                relPos: 0.5,
                            };
                        }
                    }
                    // Make sure the position is smaller or equal to 1
                    if (portLayout.relPos > 1) {
                        console.warn(`Port position for ${port.name} in ${componentId} is greater than 1. Setting to 1`);
                        portLayout.relPos = 1;
                    }

                    // Set an absolute position for the port
                    const { x, y } = this.getAbsolutePortPosition(portLayout, component);
                    portLayout.pos = { x, y };
                    portLayout.type = type;

                    const prefix = this.getPortPrefix(type);
                    component.ports.set(prefix + port.name, portLayout);

                }
            }

            processPortLayout(componentConfig.controlInputs, 'input');
            processPortLayout(componentConfig.inputs, 'input');
            processPortLayout(componentConfig.outputs, 'output');

        });
    }

    initializeConnections(layout: CPULayout) {

        let connectionsMap = new Map<string, ConnectionLayoutMapped>();

        // Add missing connections
        layout.connections.forEach((connection) => {

            const connectionId = connection.id;
            const connectionConfig = this.cpuConfig.connections.get(connectionId);
            if (!connectionConfig) throw new Error(`Connection config not found for ${connectionId}`);

            // Add the connection
            connectionsMap.set(connectionId, {
                id: connectionId,
                bends: connection.bends,
                fromPos: this.getPort(connectionConfig.from, 'output').pos as Position,
                toPos: this.getPort(connectionConfig.to, 'input').pos as Position,
            });
        });


        this.cpuConfig.connections.forEach((connection, connectionId) => {
            if (connectionsMap.get(connectionId)) return;
            connectionsMap.set(connectionId, {
                id: connectionId,
                bends: [],
                fromPos: this.getPort(connection.from, 'output').pos as Position,
                toPos: this.getPort(connection.to, 'input').pos as Position,
            });

        });

        this.layout.connections = connectionsMap;


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






    drawComponent(component: ComponentBase) {
        // Get the component layout
        const componentLayout = this.layout.components.get(component.id);
        if (!componentLayout) {
            throw new Error(`Component layout not found for ${component.id}`);
        }

        // Draw the component
        let [x, y] = this.getPos(componentLayout.pos, componentLayout.dimensions);
        // [x, y] = [x + componentLayout.dimensions.width, y + componentLayout.dimensions.height];
        const width = componentLayout.dimensions.width;
        const height = componentLayout.dimensions.height;


        // Draw the component
        this.drawRect(x, y, width, height, 'white', 'black');


        // Check if the mouse is over a components port
        let foundPort = false;
        for (let port of componentLayout.ports.values()) {
            const portPos = port.pos as Position;
            if (!portPos || foundPort) continue;
            this.drawRectCenter(portPos.x, portPos.y, 20, 10, 'lightgray', 'black');
            this.drawText(port.name, portPos.x, portPos.y - 10, 'black', '12px Arial');
        }

        // Add the name to the center of the component
        this.drawText(component.name, x + width / 2, y + height / 2, 'black', '12px Arial');



    }

    getAbsolutePortPosition(port: PortLayout, componentLayout: ComponentLayoutMapped) {
        const [componentX, componentY] = this.getPos(componentLayout.pos, componentLayout.dimensions);
        let x = componentX;
        let y = componentY;

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

    recalculateComponentPorts(componentLayout: ComponentLayoutMapped) {
        componentLayout.ports.forEach((port) => {
            const portLayout = port;
            const { x, y } = this.getAbsolutePortPosition(portLayout, componentLayout);
            portLayout.pos = { x, y };
        });

        // Recalculate connection positions
        this.recalculateConnectionPositions();
    }

    recalculateConnectionPositions() {
        this.layout.connections.forEach((connectionLayout) => {

            const fromPort = this.getPort(connectionLayout.id.split('-')[0], 'output');
            const toPort = this.getPort(connectionLayout.id.split('-')[1], 'input');
            connectionLayout.fromPos = fromPort.pos as Position;
            connectionLayout.toPos = toPort.pos as Position;




        });
    }


    getPort(portId: string, type: 'input' | 'output') {
        const [componentId, portName] = portId.split('.');
        const componentLayout = this.layout.components.get(componentId);
        if (!componentLayout) {
            throw new Error(`Component layout not found for ${componentId}`);
        }

        const prefix = this.getPortPrefix(type);
        const portLayout = componentLayout.ports.get(prefix + portName);
        if (!portLayout) {
            throw new Error(`Port layout not found for ${portId} of type ${type}`);
        }
        return portLayout;
    }

    public getConnectionPoints(connectionLayout: ConnectionLayout) {
        const [from, to, bitRange0, bitRange1] = connectionLayout.id.split('-');
        const bitRange = [parseInt(bitRange0), parseInt(bitRange1)];

        // Get the from and to port layouts
        const fromPort = this.getPort(from, 'output');
        const toPort = this.getPort(to, 'input');

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

    drawConnection(connectionLayout: ConnectionLayout) {
        const pathPoints = this.getConnectionPoints(connectionLayout);


        this.ctx.beginPath();
        this.ctx.translate(0.5, 0.5);

        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        pathPoints.forEach((point) => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
        this.ctx.translate(-0.5, -0.5);





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
        this.cpuConfig.components.forEach((component) => {
            this.drawComponent(component);
        });

        // Draw the connections
        this.ctx.strokeStyle = 'black';
        this.layout.connections.forEach((connection) => {
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



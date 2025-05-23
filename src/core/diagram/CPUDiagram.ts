import { useProjectStore } from "../../stores/projectStore";
import { decToBinary, decToHex } from "../../assets/js/utils";
import SpatialMap from "../../assets/js/utils/SpatialMap";

export class CPUDiagramPlugin {
    cpuDiagram: CPUDiagram;

    constructor(cpuDiagram: CPUDiagram) {
        this.cpuDiagram = cpuDiagram;
    }

    draw() {

    }

    destroy() {
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

    // drawIntervalRefence: NodeJS.Timeout = null as any;
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


            const fromPort = this.ports.get(connection.from) as PortLayout;
            const toPort = this.ports.get(connection.to) as PortLayout;

            // const bits = connection.bitRange[1] - connection.bitRange[0] + 1;
            // // Fix the from and to port bits
            // fromPort.bits = bits;
            // toPort.bits = bits;

            connection.fromPos = fromPort?.pos
            connection.toPos = toPort?.pos
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

    drawText(text: string, x: number, y: number, fillStyle: string, font: string, textAlign: CanvasTextAlign = 'center', textBaseline: CanvasTextBaseline = 'middle', width: number = -1) {
        this.ctx.fillStyle = fillStyle;
        this.ctx.font = font;
        this.ctx.textAlign = textAlign;
        this.ctx.textBaseline = textBaseline;

        if (width > 0) {
            const words = text.split(' ');
            let line = '';
            let yOffset = 0;
            const lineHeight = parseInt(font, 10) || 16; // Extract font size or default to 16px

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const testWidth = this.ctx.measureText(testLine).width;

                if (testWidth > width && i > 0) {
                    this.ctx.fillText(line, x, y + yOffset);
                    line = words[i] + ' ';
                    yOffset += lineHeight;
                } else {
                    line = testLine;
                }
            }

            this.ctx.fillText(line, x, y + yOffset);
        } else {
            this.ctx.fillText(text, x, y);
        }
    }






    drawComponent(componentLayout: ComponentLayout) {
        // Draw the component
        let [x, y] = [componentLayout.pos.x, componentLayout.pos.y];
        // [x, y] = [x + componentLayout.dimensions.width, y + componentLayout.dimensions.height];
        const width = componentLayout.dimensions.width;
        const height = componentLayout.dimensions.height;





        this.ctx.fillStyle = 'white';

        switch (componentLayout.type) {
            case "and":
                // Draw the and gate
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                // make a rectangle with right hlaf rounded to a circle
                this.ctx.arcTo(x + width, y, x + width, y + height, height / 2);
                this.ctx.arcTo(x + width, y + height, x + width * (3 / 4), y + height, height / 2);

                this.ctx.lineTo(x, y + height);
                this.ctx.lineTo(x, y);

                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                this.drawText('AND', x + width / 2, y + height / 2, 'black', '8px Arial', 'center', 'middle');
                break;
            case 'adder':
            case 'alu':
                // Draw the standard ALU 'carret' chape
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);

                const ratio = 0.7;
                const cutWidth = (width / 2) * ratio;
                const cutHeight = (height / 3) * ratio;

                this.ctx.lineTo(x + width, y + height / 2 - width / 3);
                this.ctx.lineTo(x + width, y + height / 2 + width / 3);
                this.ctx.lineTo(x, y + height);

                this.ctx.lineTo(x, y + height / 2 + cutHeight / 2);
                this.ctx.lineTo(x + cutWidth, y + height / 2);
                this.ctx.lineTo(x, y + height / 2 - cutHeight / 2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Add the text
                if (componentLayout.type == "alu")
                    this.drawText('ALU', x + width / 2 + 7, y + height / 2, 'black', '12px Arial', 'center', 'middle');

                break;
            case 'shift':
            case 'sign_extend':
                // Draw A ellipse with dashed borders
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.lineWidth = 1.2;
                this.ctx.stroke();
                this.ctx.lineWidth = 1;

                this.ctx.setLineDash([]);
                this.ctx.closePath();
                this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '9px Arial');
                break;
            case 'mux':
            case 'mux_reversed':
                // Draw a rectanlge with rounded corners
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, width, height, 10);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                const selectValues = componentLayout.type == 'mux_reversed' ? ['0', '1'] : ['1', '0'];

                // Draw text (0 or 1) showing which input will be selected depending on the control signal
                this.drawText(selectValues[0], x + width / 2, y + height / 4, 'black', '12px Arial', 'center', 'middle');
                this.drawText(selectValues[1], x + width / 2, y + height * 3 / 4, 'black', '12px Arial', 'center', 'middle');
                this.drawText('MUX', x + width / 2, y + height / 2, 'black', '8px Arial', 'center', 'middle');
                break;
            case 'const':
                // Get the output port and draw a rectangle with the value
                const inPort = (componentLayout?.ports ?? []).find(port => port.type === 'output');
                if (!inPort) break;
                const value = inPort.value as number;
                this.drawRect(x, y, width, height, 'white', 'black');
                this.drawText(value.toString(), x + width / 2, y + height / 2, 'black', '12px Arial', 'center', 'middle');

                break;
            case 'stage_register':
                this.drawRect(x, y, width, height, 'white', 'black');
                // Draw the text but rotated
                this.ctx.save();
                this.ctx.translate(x + width / 2, y + height / 2);
                this.ctx.rotate(Math.PI / 2);
                this.drawText(componentLayout.label, 0, 0, 'black', '12px Arial', 'center', 'middle');
                this.ctx.restore();
                break;
            case 'control_unit':
                // Draw a rectangle with rounded corners
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, width, height, 10);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Draw the text
                this.drawText('CU', x + width / 2, y + height / 2, 'black', '12px Arial', 'center', 'middle');
                break;

            case 'alu_control':
                // Draw the component
                this.drawRect(x, y, width, height, 'white', 'black');
                this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '9px Arial');
                break;

            default:
                // Draw the component
                this.drawRect(x, y, width, height, 'white', 'black');
                this.drawText(componentLayout.label, x + width / 2, y + height / 2, 'black', '12px Arial');
                break;
        }

        // Draw the ports
        if (!componentLayout.ports) return;
        if (useProjectStore().getProjectSetting('diagramShowValues') == 'none') return;
        componentLayout.ports.forEach((portConfig) => {
            const id = `${componentLayout.id}.${portConfig.id}`;
            const port = this.ports.get(id) as PortLayout;
            if (!port) return;
            this.drawPort(port);
        });

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
        let { x, y } = port.pos as Position;
        const width = 20;
        const height = 12;

        // this.drawRectCenter(x, y, width, height, 'white', 'black');

        // Add the name to the center of the component


        let value = ((typeof port.value === 'object') ? port.value?.value ?? 0 : port.value).toString() ?? '';
        const valueEnc = useProjectStore().getProjectSetting('diagramValueRepresentation');

        const unsignedValue = parseInt(value) >>> 0;
        if (valueEnc === 'hex') {
            value = '0x' + unsignedValue.toString(16).toUpperCase();
        } else if (valueEnc === 'bin') {
            value = unsignedValue.toString(2);
        }

        let isBoxed = useProjectStore().getProjectSetting('diagramShowValues') == 'boxed'

        this.ctx.font = '12px Arial';
        const portWidth = this.ctx.measureText(value).width;
        const portHeight = 12;
        // Push the text depending on the port location
        let textAlign: CanvasTextAlign = 'center';
        let margin = isBoxed ? 4 : 2;
        let rectX = x - (portWidth + margin) / 2;
        let rectY = y;
        switch (port.location) {
            case 'top':
                y -= portHeight;
                break;
            case 'bottom':
                y += portHeight;
                break;
            case 'left':
                x -= margin;
                textAlign = 'right';
                rectX = x - portWidth - margin / 2;
                break;
            case 'right':
                x += margin;
                textAlign = 'left';
                rectX = x - margin / 2;
                break;
        }
        rectY = y - (portHeight + margin) / 2;

        // Round the position
        x = Math.round(x);
        y = Math.round(y);
        rectX = Math.round(rectX);
        rectY = Math.round(rectY);


        // Add a rectangle with the port value
        if (useProjectStore().getProjectSetting('diagramShowValues') == 'boxed')
            this.drawRect(rectX, rectY, portWidth + 4, portHeight + 3, 'rgba(255, 255, 255, 0.5)', 'black');
        this.drawText(value, x, y, 'black', portHeight + 'px Arial', textAlign, 'middle');

    }

    drawConnection(connectionLayout: ConnectionLayout) {
        const pathPoints = this.getConnectionPoints(connectionLayout);

        this.ctx.beginPath();

        // Get the from port value
        const fromPort = this.ports.get(connectionLayout.from) as PortLayout;
        const fromPortValue = ((typeof fromPort.value === 'object') ? fromPort.value.value : fromPort.value) as number;

        let color = 'black';
        if (connectionLayout.type === 'data') {
            if (fromPortValue == 0)
                color = 'rgb(120, 120, 120)';
        } else {
            this.ctx.setLineDash([5, 5]);
            color = 'rgb(39, 27, 112)';
            if (fromPortValue == 0)
                color = 'rgb(173, 173, 255)';
        }

        this.ctx.strokeStyle = color;

        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        pathPoints.forEach((point) => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // // Draw the bit range
        // const bitRangeText = `${bitRange[0]}-${bitRange[1]}`;
        // const textX = (fromPortPos.x + toPortPos.x) / 2;
        // const textY = (fromPortPos.y + toPortPos.y) / 2;
        // this.drawText(bitRangeText, textX, textY, 'black', '12px Arial', 'center', 'middle');
    }

    draw() {

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);


        // Draw the connections
        this.ctx.strokeStyle = 'black';
        this.connections.forEach((connection) => {
            this.drawConnection(connection);
        });
        // Draw the components
        this.components.forEach((component) => {
            this.drawComponent(component);
        });





        // Draw plugins
        this.pluginInstances.forEach((plugin) => {
            plugin.draw();
        });
    }


    destroy() {
        // clearInterval(this.drawIntervalRefence);
        this.pluginInstances.forEach((plugin) => {
            plugin.destroy();
        });



        this.components.clear();
        this.ports.clear();
        this.connections.clear();
    }

}



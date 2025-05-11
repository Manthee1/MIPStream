import { components } from '../config/components';
import { baseControlSignals, controlSignalsWithJump } from '../config/controlSignals';
import { clone } from "../../utils";
import { default as _ } from "../config/cpu-variables";
import { instructionConfigWithJump } from "../config/instructions";
import MIPSBase from "../MIPSBase";
import { stagePorts } from '../config/ports';
import { connections } from '../config/connections/base-connections';

const flushPortTemplate: PortLayout = {
    id: "Flush",
    label: "Flush",
    type: 'input',
    location: 'top',
    bits: 1,
    value: 0,
    relPos: 0.5,
};

const IFtoIDPorts = clone(stagePorts.IFtoIDPorts);
const IDtoEXPorts = clone(stagePorts.IDtoEXPorts);
const EXtoMEMPorts = clone(stagePorts.EXtoMEMPorts);

IFtoIDPorts.push(
    {
        ...flushPortTemplate,
        ...{ value: _.Flush_IF },
    },
)
IDtoEXPorts.push(
    {
        ...flushPortTemplate,
        ...{ value: _.Flush_ID },
    },
)
EXtoMEMPorts.push(
    {
        ...flushPortTemplate,
        ...{ value: _.Flush_EX },
    },
)

const flushComponents: ComponentLayout[] = clone(components);
flushComponents.forEach((component) => {
    if (component.id === "IFtoID") component.ports = IFtoIDPorts;
    else if (component.id === "IDtoEX") component.ports = IDtoEXPorts;
    else if (component.id === "EXtoMEM") component.ports = EXtoMEMPorts;
});

const flushConnections = clone(connections);
// Flush connection template
const flushConnectionTemplate: ConnectionLayout = {
    "id": connections.length + 1,
    "from": "BranchAndGate.out",
    "to": "",
    "type": "control",
    bitRange: [0, 0],
    bends: [],
    "fromPos": {
        "x": 992,
        "y": 316.5
    },
    toPos: { x: 0, y: 0 }
};


flushConnections.push({
    ...flushConnectionTemplate,
    "id": connections.length,
    "to": "IFtoID.Flush",
    "bends": [
        { "x": 1007, "y": 115 },
        { "x": 305, "y": 115 },
    ],
    "toPos": { "x": 305, "y": 150 }
})

flushConnections.push({
    ...flushConnectionTemplate,
    "id": connections.length,
    "to": "IDtoEX.Flush",
    "bends": [
        { "x": 1007, "y": 115 },
        { "x": 605, "y": 115 },
    ],
    "toPos": { "x": 605, "y": 150 }
})

flushConnections.push({
    ...flushConnectionTemplate,
    "id": connections.length,
    "to": "EXtoMEM.Flush",
    "bends": [
        { "x": 1007, "y": 115 },
        { "x": 895, "y": 115 },
    ],
    "toPos": { "x": 895, "y": 150 }
})


export class MIPSBasicFlush extends MIPSBase {
    controlSignals = controlSignalsWithJump;
    instructionConfig: InstructionConfig[] = instructionConfigWithJump;

    public cpuLayout: CPULayout = {
        width: 1200,
        height: 700,
        components: flushComponents,
        connections: flushConnections
    };

    memory(): void {

        // Flush the output of the pipeline register if branch is taken in the previous cycle. Essectially, as if writing to the stage registers was blocked.
        if (_.BranchCond_MEM.value) {
            const stageRegistersToFlush = [this.stageRegisters.IFtoID, this.stageRegisters.IDtoEX, this.stageRegisters.EXtoMEM];
            for (let stage of stageRegistersToFlush) {
                for (let register of Object.values(stage)) {
                    register.value = 0;
                }
            }
            _.IR_EX.value = _.IR_ID.value = _.IR_IF.value = 0x0000003f; // Add a unique identifier to the IR register to indicate a flushed instruction
        }


        super.memory();
        // Update the flush signals
        _.Flush_IF.value = _.Flush_ID.value = _.Flush_EX.value = _.BranchCond_MEM.value
    }

}




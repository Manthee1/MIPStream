import { InstructionType } from "../types/enums"
import { ComponentBase } from "./components/ComponentBase"
import { StageRegister } from "./components/StageRegister"


export default class MIPSCore {

    public config: CPUConfigMapped
    registers: Array<number> = Array.from({ length: 32 }, () => 0)
    dataMemory: Array<number> = Array.from({ length: 1024 }, () => 0)
    instructionsMemory: Array<number> = Array.from({ length: 1024 }, () => 0)

    constructor(cpuConfig: CPUConfig) {

        console.log('Initializing CPU', cpuConfig)


        try {
            this.verifyConfig(cpuConfig)
        } catch (error) {
            console.error('Error initializing CPU')
            console.error(error)
        }

        this.config = this.mapConfig(cpuConfig)

    }

    verifyConfig(cpuConfig: CPUConfig) {

        // Control signals: unique names
        let controlSignalsNames = new Set<string>()
        cpuConfig.controlSignals.forEach((signal) => {
            if (controlSignalsNames.has(signal.name)) {
                throw new Error(`Control signal ${signal.name} is duplicated`)
            }
            controlSignalsNames.add(signal.name)
        })
        // Instructions, unique opcodes for non R-types, Warning for R-types with non 0 opcodes, unique mnemonic, control signals exist, control signal value does not exceed the max bits
        let instructionsOpcodes = new Set<number>()
        let instructionsMnemonics = new Set<string>()

        cpuConfig.instructions.forEach((instruction) => {
            if (instructionsOpcodes.has(instruction.opcode)) {
                throw new Error(`Instruction opcode ${instruction.opcode} is duplicated`)
            }
            instructionsOpcodes.add(instruction.opcode)

            if (instructionsMnemonics.has(instruction.mnemonic)) {
                throw new Error(`Instruction mnemonic ${instruction.mnemonic} is duplicated`)
            }
            instructionsMnemonics.add(instruction.mnemonic)

            if (instruction.type === InstructionType.R && instruction.opcode !== 0) {
                console.warn(`R-Type instruction ${instruction.mnemonic} has a non 0 opcode, defaulting to 0`)
                instruction.opcode = 0
            }

            Object.entries(instruction.controlSignals).forEach(v => {
                const [signalName, value] = v
                const signal = cpuConfig.controlSignals.find((s) => s.name === signalName)
                if (!signal) {
                    throw new Error(`Control signal ${signalName} does not exist`)
                }
                if (value > Math.pow(2, signal.bits) - 1) {
                    throw new Error(`Control signal ${signalName} value ${value} exceeds the max bits ${signal.bits}`)
                }
            })
        })



        // Stages: at least one, unique ids
        let stagesIds = new Set<string>()

        cpuConfig.stages.forEach((stage) => {
            if (stagesIds.has(stage.id)) {
                throw new Error(`Stage ${stage.id} is duplicated`)
            }
            stagesIds.add(stage.id)
        })

        // StageRegisters: amount of stages -1, unique ids, ports with unique names
        let stageRegistersIds = new Set<string>()

        cpuConfig.stageRegisters.forEach((stageRegister) => {
            if (stageRegistersIds.has(stageRegister.id)) {
                throw new Error(`Stage register ${stageRegister.id} is duplicated`)
            }
            stageRegistersIds.add(stageRegister.id)

            let stageRegistersPortsNames = new Set<string>()

            stageRegister.ports.forEach((port) => {
                if (stageRegistersPortsNames.has(port.name)) {
                    throw new Error(`Stage register port ${port.name} for stage register ${stageRegister.id} is duplicated`)
                }
                stageRegistersPortsNames.add(port.name)
            })
        })

        // Components: unique ids
        let componentsIds = new Set<string>()

        cpuConfig.components.forEach((component) => {
            if (componentsIds.has(component.id)) {
                throw new Error(`Component ${component.id} is duplicated`)
            }
            componentsIds.add(component.id)
        })
        // Connections: unique `from` `to` and bit combination, `from` and `to` exist in components and the bit range is valid
        let connectionsIds = new Set<string>()
        cpuConfig.connections.forEach((connection) => {
            const id = connection.from + '-' + connection.to + '-' + connection.bitRange[0] + '-' + connection.bitRange[1]
            if (connectionsIds.has(id)) {
                throw new Error(`Connection ${id} is duplicated`)
            }
            connectionsIds.add(id)

            // Check if the bit range is valid. it should go from high to low
            if (connection.bitRange[0] < connection.bitRange[1] || connection.bitRange[0] < 0) {
                throw new Error(`Connection ${id} has an invalid bit range. The range should be non nmegative and go from high to low`)
            }

            const fromId = connection.from.split('.')[0]
            const toId = connection.to.split('.')[0]
            const bits = connection.bitRange[0] - connection.bitRange[1] + 1;

            // Check if the from and to component or stage register exist
            const fromComponent = cpuConfig.components.find((c) => c.id === fromId, 0) as ComponentBase
            const fromStageRegister = cpuConfig.stageRegisters.find((s) => s.id === fromId, 0) as StageRegister
            const from: ComponentBase | StageRegister = fromComponent || fromStageRegister
            if (!from) throw new Error(`Connection ${id} from ${connection.from} does not exist`)

            const fromOutput = (fromComponent) ? fromComponent.outputs.find((o) => o.name === connection.from.split('.')[1]) : fromStageRegister.ports.find((o) => o.name === connection.from.split('.')[1])
            if (!fromOutput) throw new Error(`Connection ${id} from ${connection.from} does not exist`)
            if (fromOutput.bits < connection.bitRange[0]) throw new Error(`Connection ${id} from ${connection.from} has an invalid bit range.Accepted range: 0 - ${fromOutput.bits}, provided range: ${connection.bitRange[0]} - ${connection.bitRange[1]}`)


            const toComponent = cpuConfig.components.find((c) => c.id === toId, 0) as ComponentBase
            const toStageRegister = cpuConfig.stageRegisters.find((s) => s.id === toId, 0) as StageRegister
            const to: ComponentBase | StageRegister = toComponent || toStageRegister
            if (!to) throw new Error(`Connection ${id} to ${connection.to} does not exist`)

            const toInput = toComponent ? toComponent.inputs.find((i) => i.name === connection.to.split('.')[1]) : toStageRegister.ports.find((i) => i.name === connection.to.split('.')[1])
            if (!toInput) throw new Error(`Connection ${id} to ${connection.to} does not exist`)
            if (toInput.bits != bits) throw new Error(`Connection ${id} to ${connection.to} has an invalid bit range.Accepted range: 0 - ${fromOutput.bits}, provided range: ${connection.bitRange[0]} - ${connection.bitRange[1]}`)

        })


    }

    mapConfig(cpuConfig: CPUConfig): CPUConfigMapped {
        let defaultControlSignals: { [name: string]: number } = {};
        cpuConfig.controlSignals.forEach((signal) => {
            defaultControlSignals[signal.name] = 0
        })

        return {
            instructions: new Map(cpuConfig.instructions.map((i) => [i.mnemonic, { ...i, controlSignals: { ...defaultControlSignals, ...i.controlSignals } }])),
            controlSignals: new Map(cpuConfig.controlSignals.map((s) => [s.name, s])),
            stages: new Map(cpuConfig.stages.map((s) => [s.id, s])),
            stageRegisters: new Map(cpuConfig.stageRegisters.map((s) => [s.id, { ...s, ports: new Map(s.ports.map((p) => [p.name, p])) }])),
            components: new Map(
                [
                    ...cpuConfig.components.map((c) => [c.id, c]),
                    ...cpuConfig.stageRegisters.map((s) => [s.id, new StageRegister(s.id, s.ports)])
                ] as Array<[string, ComponentBase]>
            ),
            connections: new Map(cpuConfig.connections.map((c) => [c.from + '-' + c.to + '-' + c.bitRange[0] + '-' + c.bitRange[1], c]))
        }
    }
}
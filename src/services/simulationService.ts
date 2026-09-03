/** @format */

// src/services/simulationService.ts
import createSimulatorModule from "@/core/simulator/dist/simulator-runtime.js";

export async function initSimulationRuntime(topology: MyCompiledTopology) {
	// 1. Initialize the Emscripten compiled module
	const wasmModule = await createSimulatorModule();

	// 2. Allocate the flat array buffer sizes in bytes
	const bytesPerWire = 4; // uint32_t
	const sharedBufferByteLength = topology.totalWires * bytesPerWire;

	// 3. Request a pointer allocation directly inside Wasm heap space
	const heapPointer = wasmModule._malloc(sharedBufferByteLength);

	// 4. Send layout configurations down to the C engine
	wasmModule._sim_init(heapPointer, topology.totalWires, topology.components.length);

	return { wasmModule, heapPointer };
}

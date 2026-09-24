/** @format */

// Data dependency directonal graph resolution enigne that resolves the order of execution of components based on their input and output dependencies.
class Engine {
	config: Record<string, SerializedEngineComponentConfig>;
	state: Uint32Array;

	constructor() {
		this.config = {};
		this.state = new Uint32Array(1024); // Initialize state with a fixed size, can be adjusted as needed
	}

	loadConfig(config: SerializedEngineComponentConfig[]) {
		// Load the configuration for each component into the engine's config object
		for (const component of config) {
			this.config[component.name] = component;
		}
	}
}

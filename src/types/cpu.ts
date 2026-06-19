/** @format */

import { Component, DefineComponent } from "vue";

export type ComponentEdge = "top" | "left" | "right" | "bottom";

export interface CPUComponentPort {
	id: string; // Mandatory for connecting wires securely
	name: string;
	display_name?: string;
	description?: string;
	width: number; // Bit-width (e.g., 1, 8, 16, 32)
	is_clock?: boolean; // Identifies sequential clock pins
}

// Visual anchoring layout meta decoupled from the functional ports
export interface CPUComponentHandle {
	port_id: string;
	edge: ComponentEdge;
	// Relative location from beginning of the edge in percentage (0-100)
	position: number;
}

export interface Panel {
	id: string;
	title: string;
	component: Component | DefineComponent;
}

// Strongly typed configuration schemas for runtime field generation
export interface CPUComponentConfigField {
	key: string;
	label: string;
	type: "number" | "string" | "select" | "boolean" | "matrix";
	options?: { label: string; value: any }[]; // Used if type is "select"
	default?: any;
	description?: string;
}

// Runtime reactive properties updated during simulation cycles
export interface CPUComponentDataField {
	key: string;
	label: string;
	type: "uint32" | "string" | "array";
	size?: number; // Array boundary sizing if type is "array"
	wasm_offset?: number; // Shared memory block indexing offset for C engine
}

export interface CPUComponentVariant {
	id: string;
	name: string;
	display_name?: string;
	description?: string;
	dimensions?: { width: number; height: number }; // Dictates node sizing variants
	input_ports: CPUComponentPort[];
	output_ports: CPUComponentPort[];
	handles: CPUComponentHandle[]; // Binds ports to physical canvas handles
}

enum CPUComponentFlag {
	IsClocked = 1, // Indicates if the component has clocked behavior
	AllowAttachCustomPorts = 2, // Allows dynamic attachment of custom ports beyond the defined schema
}

export interface CPUComponent {
	id: string;
	name: string;
	display_name: string;
	category: "combinational" | "sequential" | "ui"; // Core engine execution classification
	variants: CPUComponentVariant[];
	panels?: Panel[]; // Registered sidebar/dockview dashboard panels
	config_schema?: CPUComponentConfigField[]; // Describes editable field specifications
	data_schema?: CPUComponentDataField[]; // Describes diagnostic state properties
	canvas_component: Component | DefineComponent; // The Custom Vue Flow Node Template
	flags?: number; // Bitfield for boolean properties like CPUComponentFlag.IsClocked
	attach_port?: (instance: CPUComponentInstance, port: CPUComponentPort) => void; // Optional callback for dynamic port attachment logic
}

export interface CPUComponentInstance {
	id: string; // Unique string UUID instance on canvas
	component_id: string; // Map back to parent CPUComponent properties
	variant_id?: string; // Active Figma-style layout choice
	config: Record<string, any>; // Saved key-value states matched against config_schema
	data: Record<string, any>; // Live output evaluations matched against data_schema
	position: { x: number; y: number };
}

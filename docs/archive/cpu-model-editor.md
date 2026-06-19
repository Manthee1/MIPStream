**Designing the CPU Model Editor**

## Conceptualizing Key Features

We're envisioning an interactive and flexible tool for designing RISC-based CPU
architectures. To bring this vision to life, we'll focus on several essential
features.

### Dynamic Pipeline Configuration

* **Flexible Register Management**: Allow users to dynamically add or remove
stage registers, enabling them to experiment with various pipeline
configurations.
* **Register Validation**: Ensure that all register names are unique and
enforce a naming convention for consistency.
* **Intelligent Wire Management**: When removing a register with attached
components, prompt the user for confirmation and automatically disconnect
associated wires.

### Connections and Configuration

* **Wire Context Menu**: Provide an intuitive way to configure connection
properties by right-clicking on wires, offering options for:
	+ Resizable bit width configuration
	+ Exact bit width input
* **Port Context Menu**: Enable users to access a context menu when
right-clicking on ports, featuring options for:
	+ Disconnecting specific connections
	+ Disconnecting all connections from the port
	+ Viewing and managing connections

### Instruction Set Architecture (ISA) Selection

* **Predefined ISAs**: Allow users to select from a set of predefined ISAs or
create their own custom ISA.
* **Customizable Instructions, Registers, and Memory Configurations**

### Undo, Redo, and Usability Enhancements

* **Undo and Redo Functionality**: Implement seamless undo and redo
capabilities for experimentation and correction.
* **Usability Features**:
	+ Grid mode toggle and fineness config
	+ Selecting multiple components and moving them around
	+ Keyboard shortcuts for common actions (e.g., copy, paste, delete)
	+ Zooming in/out with mouse wheel or touchpad gestures
	+ Resettable zoom level display
	+ Customizable selection box drawing behavior

This reworded version aims to present the conceptual ideas in a more organized
and easy-to-follow manner.
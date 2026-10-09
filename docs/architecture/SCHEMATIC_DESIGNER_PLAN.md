# Implementation Plan: Interactive Schematic Designer ( Completed)

This document details the transition from basic component layouts to a professional **Schematic Designer Class**. This system manages state, netlists, and interactive placement logic.

---

## Stage 1: Core Architecture & Canvas Initialization

### 1.1 The `SchematicDesigner` Class
The designer logic will be encapsulated in a pure TypeScript class to separate simulation/editing logic from Vue rendering.

- **Config Interface**:
  ```ts
  interface DesignerConfig {
    container: HTMLElement;
    mode: 'viewer' | 'editor';
    gridSize: number;
    onUpdate?: (netlist: any) => void;
  }
  ```
- **State Management**:
  - `viewport`: `{ x, y, zoom }`
  - `activeTool`: `select | wire | delete | place`
  - `selection`: List of selected module/wire IDs.
  - `history`: Undo/Redo stack.

### 1.2 Viewport & Grid
- **Konva Layering**:
  - **Background Layer**: Static grid lines (cached for performance).
  - **Logic Layer**: Modules and Wires.
  - **Interaction Layer**: Selection boxes, ghost previews, and port highlights.
- **Transformations**: Implement standard CAD navigation (Middle-mouse pan, Scroll-zoom centered on cursor).

### 1.3 Template Toolbar
- UI components (Sidebar/Top bar) that bind directly to `designer.setTool()`.
- Status indicators for "Snap to Grid" and "Coordinate Tracking".

---

## Stage 2: Context-Aware Keyboard Shortcuts

### 2.1 Context Scoping
A "Context Manager" will track active execution scopes to prevent shortcut collisions (e.g., `Delete` should only work when a module is selected and not when typing in a text field).

- **Active Scopes**:
  - `schematic:editor`: Global editor active.
  - `schematic:selection`: One or more items selected.
  - `schematic:placing`: Currently hovering a new module to place.
  - `schematic:routing`: Currently drawing a wire.

### 2.2 Keybindings Registry
| Key | Context | Action |
|-----|---------|--------|
| `Esc` | `schematic:placing` | Cancel placement |
| `Esc` | `schematic:selection` | Clear selection |
| `Del` | `schematic:selection` | Remove selected items |
| `R`   | `schematic:placing` | Rotate ghost module |
| `W`   | `schematic:editor` | Select Wire tool |
| `V`   | `schematic:editor` | Select Selection tool |

---

## Stage 3: Dynamic Manifest Draw Functions

### 3.1 Evolution of the Manifest
Manifests must transition from static icons to dynamic rendering functions to support real-time resizing and port alignment.

- **Draw Signature**:
  ```ts
  interface ModuleManifest {
    // ... metadata ...
    render: (group: Konva.Group, config: TConfig) => void;
    getRelativePorts: (config: TConfig) => PortPosition[];
  }
  ```

### 3.2 Relative Port Calculation
Port coordinates must be calculated relative to the module's center `(0,0)`.
- When a module rotates, `designer` uses the manifest's `getRelativePorts` + the module's `rotation` to calculate absolute connection points.

---

## Stage 4: "Select & Place" Engine

### 4.1 Workflow Shift
Drag-and-drop is replaced with a "Stamp" workflow for higher precision.

1. **Selection**: User clicks a module in the sidebar.
2. **Ghost Mode**: `activeTool` becomes `place`. A "Ghost Module" is instantiated.
3. **MouseMove**: The ghost module follows the cursor, snapped to `designer.gridSize`.
4. **Interaction**: 
   - `R` rotates the ghost.
   - `Tab` (optional) cycles configurations.
5. **Placement**: Click on canvas commits the module to the project's netlist.

### 4.2 Preview Rendering
The cursor preview uses the exact `render()` function from the Manifest (Stage 3) but with a lowered opacity or dashed stroke to indicate it is a preview.

---

## Stage 5: Wire Routing & Connectivity

### 5.1 Port Snapping
- When the `wire` tool is active, `designer` highlights all ports within a proximity threshold.
- Cursor snaps to port centers automatically.

### 5.2 Orthogonal Routing
- Implement a 90-degree constraint for wires.
- **Routing Algorithm**:
  - Step 1: Click start port.
  - Step 2: Move mouse (preview shows L-shape path).
  - Step 3: Click to add "Waypoints" or double-click/click target port to finish.

### 5.3 Netlist Integration
- Wires are stored as connections between `(ModuleID:PortID)` pairs.
- Moving a module triggers a `recomputeWires()` event for all connected nets.


! This plan was already completed
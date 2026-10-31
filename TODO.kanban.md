<!-- This is a Kanban Board file created with MD Kanban extension -->
<!-- GitHub: https://github.com/jebakumarj/md-kanban -->
<!-- VS Code Extension: Search "MD Kanban" in the extension store (ID: jeddak.md-kanban) -->

# MipStream Board

## Simulator

#### Feat: Assembly code editor panel
<!-- id: task-1792838400000-0 -->
Add a CodeMirror-based editor as a dedicated panel in Simulator mode (follows the general architecture configurator, which is already done). Must work generically with any ISA definition provided to it.
- [x] CodeMirror 6 foundation (Phase 4): line numbers, history, token-synced theme, two-way `sourceCode` binding
- [x] Diagnostics strip (line + column, click-to-reveal) consuming the Phase 1 assembler contract
- [ ] Syntax highlighting and autocomplete
- [ ] Linting and inline error highlighting
- [ ] `Ctrl+Click` go-to-definition
- [ ] Highlighting of the currently simulated instruction
- [ ] Other common code-editor conveniences
- [x] Include a compile button in the panel
Tags: `feat` `simulator`

#### Fix: Schematic viewer panning
<!-- id: task-1792838400000-1 -->
Allow panning/scrolling around the schematic in the simulator's viewer mode.
- [x] Done (Phase 4): left-drag pans in viewer mode (`EventManager.canPanWithPrimary`), wheel zoom and right-drag pan were already active
Tags: `fix` `simulator`

## Architecture Designer

### Control Unit

#### Feat: Show output port labels
<!-- id: task-1792877672095-87 -->
Make the name/label of each control unit signal visible so a user doesn't need to hover over a port to see its name.
Tags: `control-unit` `designer` `fix`

#### Feat: Add the ability to configure net styles
<!-- id: task-1792877912661-208 -->
Add the ability to change the style of a net to dotted, dashed, solid or other options. Should also work when selecting multiple nets at once.
Tags: `feat` `designer` `control-unit`

### Editing & Interaction

#### Fix: Net deletion granularity
<!-- id: task-1792838400000-2 -->
Deleting a net should remove only the selected segment, not the entire net.
Tags: `fix` `designer`

#### Fix: Wire ghost fidelity
<!-- id: task-1792838400000-3 -->
Final wires should follow the dashed routing ghost exactly; they sometimes route the opposite way instead using a reversed 90 degree bend.
Tags: `fix` `designer`

#### Feat: Edit history
<!-- id: task-1792838400000-4 -->
Implement undo/redo for the schematic editor.
Tags: `feat` `designer`

#### Feat/Fix: Fine-grained wire routing on drag
<!-- id: task-1792838400000-5 -->
Currently only works when dragging modules; should also work when holding `Alt` and dragging a wire.
Tags: `feat-fix` `designer`

### Theme & Rendering

#### Fix: Theme switching
<!-- id: task-1792838400000-6 -->
Changing the theme should update diagram colors immediately; currently a page reload is required.
Tags: `fix` `designer` `theming`

### Stage Registers

#### Feat: Configurable pin count
<!-- id: task-1792838400000-7 -->
Stage registers should support a configurable number of input/output pins (input and output counts must stay in sync). Reuse the control unit's UI pattern.
Tags: `feat` `designer` `stage-registers`

#### Feat: Toggleable reset pin
<!-- id: task-1792838400000-8 -->
Add an optional reset pin on top of the stage register, togglable from configuration.
Tags: `feat` `designer` `stage-registers`

#### Fix: Guard deletion of architecture-defined stage registers
<!-- id: task-1792838400000-9 -->
Attempting to delete a stage register defined by the architecture should surface an error instead of allowing it.
Tags: `fix` `designer` `stage-registers`

### Bit Splitter / Merger

#### Fix: Show warning on over-wide auto-mapping
<!-- id: task-1792838400000-10 -->
When auto-mapping a range `x:y` wider than the configured output, show a yellow warning. Currently it silently fails and maps nothing.
Tags: `fix` `designer` `splitter-merger`

#### Fix: Splitter one-to-many mapping
<!-- id: task-1792838400000-11 -->
Allow wiring a single input pin to multiple output pins; currently only one-to-one mapping is supported.
Tags: `fix` `designer` `splitter-merger`

#### Fix: Merger multi-drive rejection
<!-- id: task-1792838400000-12 -->
Disallow wiring multiple inputs to the same output pin. Currently this is accepted, warned about, and treated as a wired OR — not the expected behavior.
Tags: `fix` `designer` `splitter-merger`

### ALU & ALU Control Unit

#### Feat: Configurable operations and signal mapping
<!-- id: task-1792838400000-13 -->
Make ALU operations and their control-signal mappings editable, with a "reset to default" button.
- [ ] Default to the standard 4-bit ALU control signal mapping: `0000: AND`, `0001: OR`, `0010: ADD`, `0011: SUB`, `0100: SLT`, `0101: NOR`, `0110: XOR`, `0111: SLL`, `1000: SRL`, `1001: SRA`, `1010: LUI`, `1011: MULT`, `1100: DIV`, `1101: REM`, `1110: NOP` (extend with any missing standard operations)
Tags: `feat` `designer` `alu`

### Architecture Import / Export

#### Feat: Architecture configuration import, export, and "save as template"
<!-- id: task-1792838400000-14 -->
- [ ] Add a new IndexedDB table for user-made architecture templates
- [ ] "Save as template" stores the current architecture configuration in that table
- [ ] Export produces a single file containing the architecture configuration plus all templates from that table; import restores both to the state they were in when exported
- [ ] On Electron, expose this as "Save architecture as" / "Load architecture" backed by the local file system
Tags: `feat` `designer` `import-export`

#### Enable multi select when holding CTRL
<!-- id: task-1793270909936-93 -->
<!-- group:  -->
While holding CTRL, clicking on multiple modules/netlist segments, it should select them.
Tags: `designer` `QOL`
<!-- priority: low -->

#### Improve Cordinates functionality
<!-- id: task-1793271154991-190 -->
<!-- group:  -->
The designers cordinates are not very usable and specify the cordinates of the screen and not the mouse.
Tags: `QOL` `designer`
<!-- priority: low -->
<!-- workload: easy -->

#### Improve grid funcionality
<!-- id: task-1793273338293-290 -->
<!-- group:  -->
The grid is usable but needs some QOF fixes and improvements.
- There needs to be a clear indicator of where the absolute center of the canvas is
- The module's ports are not aligned with the actual grid size making it janky to connect them, introducing unnecessay bends. Ideally should be fixed by removing the grid size config, standardizing it to 1 units, and changing all the module ports to be aligned on a whole unit, ideally the schematic symbol of the module should also be drawn aligned whole unit too. This will most likely require changing almost every module manifest.
- Change moving elements to translate them irrespective of zoom/scale of the canvas. Should conform the size of one unit. Meaning when zoomed out the translation will look finer, and zoomed in it will look more dramatic with visible grid snaping.
- [ ] Add a Canvas Center indicator
- [ ] Remove the grid size config fields and set a fixed size of 1 unit
- [ ] Standardize all port locations and schematic symbols to use whole units
Tags: `feat-fix` `QOL` `designer`
<!-- workload: hard -->

## Project Management

#### Feat: Resume where you left off
<!-- id: task-1792838400000-15 -->
Remember the last project and mode, encoded in the URL route/params, and restore them on launch.
Tags: `feat` `project-management`

#### Feat: Per-project layout persistence
<!-- id: task-1792838400000-16 -->
Remember each project's Golden Layout panel state (position, size, collapsed state, etc.) and restore it when the project is opened.
Tags: `feat` `project-management` `layout`

#### Feat: Autosave
<!-- id: task-1792838400000-17 -->
Automatically persist project state.
Tags: `feat` `project-management`

#### Fix: MIPS single-cycle template
<!-- id: task-1792838400000-18 -->
Update the architecture template to match the updated architecture configuration and modules.
- [x] Done (Phase 3, 2026-10-24): `mips-basic` ships the golden single-cycle datapath (`src/config/mips-single-cycle-datapath.ts`), validated headlessly by Rig C/D in `npm run simulation:check`
Tags: `fix` `project-management` `mips`

#### Feat: Architecture Simulation Project Integration & Workflow Refinement
<!-- id: task-1793439728114-108 -->
Introduce a Simulation-Only project Mode and a dynamic architecture switching workflow to streamline the user experience when testing code against different hardware models. By decoupling code execution from circuit editing, the interface will simplify into an IDE-focused visualizer when full schematic access is not required. Swapping architectures directly from the topbar will trigger compatibility checks that dynamically adjust the active UI panels—protecting editor buffers and alerting users whenever hardware shifts remove or add components like Instruction Memory, Data Memory, or Register Files.
- [ ] Extend project configuration schema with a project_mode ("full" vs. "simulation_only") property and persist it.
- [ ] Conditionally hide the Designer View toggle and skip designer initialization when "project_mode" is set to "simulation_only".
- [ ] Add an architecture info badge displaying current metadata directly into the topbar.
- [ ] Implement a topbar quick-select dropdown for swapping the active architecture (can be a more styleized popup panel with search functionality).
- [ ] Create a pre-switch validation utility that compares current and target architecture manifests to detect incoming panel additions or removals.
- [ ] Implement a warning confirmation modal alerting users when an architecture switch will drop un-supported panels or un-link code editors due to missing Instruction Memory. The editor warning should be red since the code should get removed, while the panel warning can be yellow since they don't have saveable state anyway.
- [ ] Refactor the simulation UI layout engine to dynamically mount or unmount panels based on the target architecture's active capabilities.
- [ ] Handle safe state preservation, un-linking, or cleanup of active code buffers and breakpoints during dynamic layout transitions.
Tags: `QOL` `uiux` `simulator` `feat`

## UI/UX

### View Menu (Alt menu → "View")

#### Feat: Panel toggles
<!-- id: task-1792838400000-19 -->
A simple toggleable list of existing project panels, grouped by mode (Simulator/Designer), with "Show all" and "Hide all" buttons at the top.
Tags: `feat` `uiux` `view-menu`

#### Feat: Reset layout button
<!-- id: task-1792838400000-20 -->
Restores the current layout to its default.
Tags: `feat` `uiux` `view-menu`

#### Feat: Multiple base layouts
<!-- id: task-1792838400000-21 -->
Let the user pick a base layout from a list, with a "Save current layout as new" button at the bottom.
Tags: `feat` `uiux` `view-menu` `layout`

### Other

#### Feat: Mode-switch keyboard shortcut
<!-- id: task-1792838400000-22 -->
A hotkey to toggle between Simulator/Designer modes.
Tags: `feat` `uiux`

#### Feat: Floating simulation controls
<!-- id: task-1792838400000-23 -->
Let the simulation control buttons pop out of the topbar into a movable floating toolbar (like VS Code's draggable debug controls). Not a separate panel; it should be draggable around the screen and dockable back into the topbar.
Tags: `feat` `uiux` `simulation`

#### Feat: Recent Projects table (Home page)
<!-- id: task-1792838400000-24 -->
Replace the Recent Projects section with a searchable, sortable table.
- [ ] Columns: Project Name, Last Modified, Mode, Actions
- [ ] Actions: "Open", "Delete", "Rename"
- [ ] Sortable by every column
- [ ] Search bar (by project name) at the top
Tags: `feat` `uiux` `project-management`

#### Fix: Diagram visualization bottom bar spils over
<!-- id: task-1793274872122-461 -->
The Visualization diagram in simulation mode has a bottom bar that spills over to the components bellow and subsequently makes it unresizable from the bottom.
Tags: `fix` `uiux`

#### Feat: Diagarm educational element info
<!-- id: task-1793275237015-532 -->
- Higlight the netlist or module currently being hoverd over to better see where it connects or ends.
- Show a tooltip of information about the netlist or module. Module will show its normal manifest and or architecture specific info while the netlist will show its value in different formats and list what modules it connects
Tags: `feat` `mips` `uiux`

## Electron App

#### Feat: Electron build
<!-- id: task-1792838400000-25 -->
An offline-capable desktop version with local file system access for saving/loading projects.
Tags: `feat` `electron`

#### Feat: Project export/import
<!-- id: task-1792838400000-26 -->
Export a single file containing all project data (including the Golden Layout state); import restores the project to the state it was in when exported. In Electron, expose this as "Save as" / "Open" against the file system.
Tags: `feat` `electron` `import-export`

#### Feat: Project "Save as"
<!-- id: task-1792838400000-27 -->
Creates a copy of the current project under a new name, leaving the original intact. In Electron, saves the copy to the file system.
Tags: `feat` `electron`

## Done

#### Feat: General architecture settings
<!-- id: task-1792838400000-28 -->
Configure pipeline stages, assembler, ISA definition, and related options in one place.
Tags: `feat` `settings`

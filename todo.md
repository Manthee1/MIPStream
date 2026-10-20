# Todo


## Simulator
- [ ] Feat: After adding the general architecture configurator, Add codemirror editor to handle the assembly editing and syntax highlighting. (This should be a separate panel in the simulator mode.). It shold also include everything from syntax highlighting, auto complete, linting, error highlighting, CTRL+click to go to definition, curent simulated instruction highlighting, and other features that are common in code editors. ANd it should handle all that for any ISA definition that is provided to it. Also it should have a compile button.
- [ ] Fix: Allow paning around the schematic viewer.



## Architecture Designer
- [ ] Fix: Make deletion of a net delete the specific selected segment rather then the whole net
- [ ] Fix: Make wires connect exactly like their dashed ghost rather then sometimes chossing to go the opposite way
- [ ] Feat: Make stage registers have configurable amount of intput/output pins (both have to be together.) Similar to how the control unit works.
- [ ] Feat: Make stage register include a toggelable reset pin from the top.
- [ ] Feat: Edit history - undo/redo
- [ ] Fix: Swithing themes doesne't automatically update the diagram colors. (Have to reload the page to see the changes.)
- [ ] Feat: Add a general architecture settings where we can configure the pipeline stages, assembler, ISA definition and other things.
- [ ] Fix: Make the Bit splitter/merger output show a yellow warning when you try to auto map from x to y (x:y) if it is more bits then the output has configured. (Currently it just silently fails and doesn't map anything.)
- [ ] Fix: Allow the bit splitter to wire an input pin to multiple output pins. (Currently it only allows one to one mapping.)
- [ ] Fix: Disallow multiple inputs to be wired to the same output pin on the bit merger. (Currently it allows, shows a warning, and uses it as a wired OR. This is not the expected behavior.)
- [ ] Feat: Expand the ALU and ALU control unit to have their operations and signal mapping configurable.( Also include a reset to default button.) Use a 4 bit standard ALU control signal mapping for the default. (0000: AND, 0001: OR, 0010: ADD, 0011: SUB, 0100: SLT, 0101: NOR, 0110: XOR, 0111: SLL, 1000: SRL, 1001: SRA, 1010: LUI, 1011: MULT, 1100: DIV, 1101: REM, 1110: NOP... ANd others if we are missing something).

## Project Management
- [ ] Feat: Make the app remember where you left off (including which project and which mode you were on) - use URL route and params wor that.
- [ ] Feat: Make app also remember each projects golden layout panels (position,size, collapsed state...) and restore them when the project is opened.
- [ ] Feat: Add autosave feature to the app.
- [ ] Fix: Update the MIPS Single cycle architecture template to match the updated architecture configuration and modules.

## UI/UX
- [ ] Feat: Add panel toggles to the Alt menu "View" item. Have it as simple toggelable list of existing project panels grouped by thier mode (Simulator/Designer). Also add a "Show all" and "Hide all" button to the top of the list.
- [ ] Feat: Add a "Reset layout" button to the Alt menu "View" item.
- [ ] Feat: Add multiple base layouts to the app. The user should be able to select a base layout from the Alt menu "View" item. (This should be a list of existing layouts with a "Save current layout as new" button at the bottom.)
- [ ] Feat: Add a keyboard shortcut to switch between modes (Simulator/Designer).
- [ ] Allow the Simulation control buttons to pop out from the topbar and be moved around the screen. SImilar to how VSCode allows the debug control buttons to be moved around the screen. This should not be a seperate panel, but rather a floating toolbar that can be moved around the screen and docked to the topbar.
- [ ] Feat: Change Recent Projects section of Home page into a table (with columns: Project Name, Last Modified, Mode, and Actions). The Actions column should have buttons for "Open", "Delete", and "Rename". The table should be sortable by each column. and searchable by project name. (This should be a table with a search bar at the top and sortable columns.)

## Electron App
- [ ] Feat: Add an electron version of the app. It should be able to run offline and have a local file system access to save/load projects.
- [ ] Feat: Add a Export and import project feature. Export should create a single file with all the project data (including the golden layout) and import should be able to read that file and restore the project to the state it was in when exported. (This should be just "Save as" and "Open" for the electron version of the app.)
- [ ] Feat: Add a "Save as" feature to the project menu. It should create a copy of the current project with a new name and keep the original project intact. - In electron it would save it to the file system. 


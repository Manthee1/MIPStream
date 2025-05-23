
General
- [x] Rework stores. Split view storage into project storage and UI storage
- [x] Rework the storage system to be more efficient. Use IndexDB
- [x] Add project settings
- [x] Add options to each workspace panel
- [x] Add multi cpu support
- [x] Add custom instructions
- [x] Add help

Home
- [x] Make projects sorted by last opened

Menu
- [x] Fix Open Recent
- [x] Make "New" work
- [x] Make "Open" work - Renamed to "Import Project"
- [x] Make open recent reactivity fetch recent projects (After storage rework)


Simulator
- [x] Add instruction documentation
- [x] Add more instructions
- [x] Add Speed control
- [x] Add shortcuts simulation control
- [x] Add hex and binary number support
- [x] Disable control buttons when not possible to use
- [x] Add advance register convention support
- [x] Add ability to change register and memory values

Project Settings
- [x] Add ability to change the memory size
- [x] Add ability to change current cpu

Settings
- [x] Make autosave work
- [x] Add overlay for settings
- [x] Add shortcuts to settings (exit)


Diagram
- [x] Add custom icons for components
- [x] Connect Reg1Data to the ALU
- [x] Add more hover information
- [x] Add ability to change in what format the data is shown (hex, binary, decimal)
- [x] Add keyboard shortcuts to the diagram (show port names...) 
- [ ] Add highlighting of components
- [ ] Add proper dark mode support
- [ ] Add bit-range display
- [ ] Add the ability to pan and zoom the diagram (very low priority)
- [ ] Fix the bits display in the diagram

Other Visuals
- [x] Remove CPU window title
- [x] Improve memory view
- [x] Add the ability to show what data is going to be changed/used in the next instruction
- [x] Fix editor popover clipping
- [x] Add info about code changes that were not assembled while the cpu is running

Other Functionality
- [x] Add Project rename
- [x] Add name and description to keyboard shortcuts( for future addition into a help screen)

Bugs
- [x] Fix editing the code while running the simulation directly changing cpuview stage instruction info
- [x] Closable tabs that will vanish forever
- [x] Fix badly parsed error when assembling
- [x] Fix project delete
- [x] Assembler errors persisting after leaving project and ignoring unsaved changes and opening the project again
- [x] Fix loading project the second time breaks diagram
- [x] Fix instructions loaded after halt
- [x] Fix stages line display not handling long lines


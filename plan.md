# MIPS CPU architecture web based simulator

## Requirements
- [ ] Load/Save program from/to file
    - [ ] Desktop
      - [ ] Load
      - [ ] Save
    - [x] Web
      - [x] Load
      - [x] Save
- [ ] Execution control
  - [x] Run
  - [x] Pause
  - [x] Stop
  - [x] Step
  - [x] Reset
  - [x] Debugging
    - [x] Set breakpoints
    - [x] Clear breakpoints
- [ ] Display
  - [ ] Settings
  - [ ] Visualize MIPS CPU circuit
  - [x] Registers (view)
  - [x] Memory (view)
  - [ ] Editor
    - [ ] Syntax highlighting
    - [x] Line numbers
    - [x] Breakpoints
    - [ ] Error highlighting
- [ ] Assembler
  - [ ] Basic Functionality
    - [ ] Instructions
    - [x] Comments
    - [x] Labels
    - [ ] Functions/Procedures
    - [ ] Directives

## Additional features
- [ ] Full Register/memory manipulation
  - [ ] Edit memory
  - [ ] Clear memory
  - [ ] Change memory size
  - [ ] Edit registers
  - [ ] Clear registers
  - [ ] Change register amount
- [ ] Custom Instructions
  - [ ] Add custom instructions
  - [ ] Remove custom instructions
  - [ ] Edit custom instructions

## Views
- [x] Bootstrap(New Project, Open Project, Recent projects list)
- [x] Main (Editor, Visualizer, Registers, Memory)
- [ ] Settings
- [ ] Help


## Technologies
- [x] Tauri
- [x] Vue
- [x] Monaco Editor
- [x] File Storage API - changed to simple localStorage

## Resources
Tauri: https://tauri.app/v1/guides/features/command
Vue: https://vuejs.org/
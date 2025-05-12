# General Help

Welcome to the **MIPStream Simulator**! This guide provides an overview of the simulator's features, controls, and functionality to help you get started.

---

## **Overview**
MIPStream is a web-based simulator designed to help users understand and experiment with the MIPS architecture. It provides an interactive environment for assembling, running, and debugging MIPS assembly programs.

---

## **Key Features**
- **Assembly Code Editor**: Write and edit MIPS assembly code directly in the built-in editor.
- **Simulation Controls**: Run, pause, step through, and stop simulations with intuitive controls.
- **Visualization**: View the state of registers, memory, and pipeline stages in real-time.
- **Error Detection**: Identify and debug errors in your assembly code with helpful feedback.
- **Customizable Layout**: Adjust the workspace layout to suit your preferences.


---

## **General User Interface Overview**
- **Top Bar**: Contains a dropdown menu accessible via the hamburger icon, the title of the project/page, and a quick acess button to switch between light and dark mode. The hamburger menu provides access to various options, including creating, importing, downloading projects, accessing settings and other navigation options.
- **Settings Window**: Access general and project-specific settings to customize the simulator's appearance and functionality.
- **Help Dialog**: Open the help dialog for quick access to documentation and troubleshooting tips.
- **Notification Area**: Displays notifications and error messages related to the simulator's operation. Located in the bottom left corner of the screen.

---

## **Getting Started**
1. **Create a New Project**:
   - Either click the **hamburger menu** in the top left corner and select **New**, or use the **New Project** button from the home page.
   - Supply a name for your project to the prompt that appears and click **Create Project**.
   - A new project will be created, and opened.
   - 
2. **Write Your Code**:
   - Focus on the editor and write your MIPS assembly code.
   - Use `.data` and `.text` sections to define variables and instructions.

3. **Assemble and Load**:
   - Click the **Assemble and Load** button (or press `F6`) to assemble your code and load it into the simulator.

4. **Run the Simulation**:
   - Use the **Run** button (or press `F5`) to start the simulation.
   - Adjust the simulation speed using the slider.

5. **Pause, Resume, or Step**:
   - Pause the simulation with the **Pause** button (`F8`).
   - Resume the simulation with the same button.
   - Use the **Step** button (`F9`) to execute one instruction at a time.

6. **Stop the Simulation**:
   - Stop the simulation with the **Stop** button (`Shift + F5`).

---

## **Keyboard Shortcuts**
Here are some useful shortcuts to control the simulator:
- **Assemble and Load**: `F6`
- **Run Simulation**: `F5`
- **Pause/Resume Simulation**: `F8`
- **Step Through Simulation**: `F9`
- **Stop Simulation**: `Shift + F5`
- **Open General Settings**: `Ctrl + ,`
- **Open Project Settings**: `Ctrl + Alt + ,`
- **Open Help Window**: `Ctrl + H`
- **Reset Layout**: `Ctrl + Shift + L` (In case the layout breaks)

---


## **Common Errors**
1. **Syntax Errors**:
   - Ensure your assembly code follows MIPS syntax.
   - Labels must end with a colon (`:`), and instructions must use valid mnemonics.

2. **Memory Access Violations**:
   - Ensure memory addresses are aligned (e.g., word addresses must be multiples of 4).
   - Avoid accessing memory outside the allocated range.

3. **Unresolved Labels**:
   - Verify that all labels used in your code are defined in the `.text` section.

---

## **Tips for Effective Use**
- Use the **Step** feature to debug your code instruction by instruction.
- Adjust the simulation speed for better visualization of pipeline stages.
- Save your projects frequently using `Ctrl + S`.
- Check out the **Project Settings** to configure visuals and functionality.

---

## **Need More Help?**
If you encounter any issues or have questions, refer to the detailed documentation. You can also access the **Help Dialog** by pressing `Ctrl + H`.
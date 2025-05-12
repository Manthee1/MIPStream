# Simulator

## Editor
The **Monaco Editor** is a powerful code editor integrated into the platform, designed to enhance your programming experience with features like syntax highlighting, error detection, and intelligent suggestions.

### Key Features
- **Syntax Highlighting**: The editor applies distinct colors and styles to different syntax elements, improving readability and reducing errors.
- **Autocomplete (Suggestions)**: Press `CTRL + Space` to open the autocomplete widget, which provides context-aware suggestions for mnemonics, registers, and other syntax elements.
- **Error Highlighting**: The editor highlights syntax errors in real-time, helping you identify and fix issues quickly.
- **Info Widget**: Hover over text (e.g., values, mnemonics, registers) to view additional information. For numbers, the widget displays their representation in hexadecimal, signed, and unsigned formats for 8-bit, 16-bit, and 32-bit interpretations.
- **Breakpoints**: Click on the left margin of the editor to set or remove breakpoints. Breakpoints are indicated by a red dot and allow you to pause program execution at specific lines for debugging purposes. Make sure they are on actual instructions, as they will be ignored otherwise.
- **Active Line Highlighting**: The current line of code being executed is highlighted, making it easy to follow the program's flow. The color of the highlight depends on the current stage of the instruction.

> **Note:** Editor settings can be customized in **General Settings > Editing Tab**.

---

### Program Syntax

MIPS programs are divided into sections and follow a specific structure. Below is an overview of the key components:

#### `.data` Section
The `.data` section is used to define and initialize data variables. Each variable is assigned a label and a data type.

Example:
```asm
.data
    msg: .asciiz "Hello, World!"  ; Null-terminated string
    num: .word 42                ; 32-bit integer
```

#### `.text` Section
The `.text` section contains the program's instructions. This is where the actual code resides.

Example:
```asm
.text
main:                       ; Label for the main function (not necessary)
    li $v0, 4               ; Load system call for printing a string
    la $a0, msg             ; Load address of the string
    syscall                 ; Execute the system call
```

#### Data Definitions
Data definitions specify the type and size of data. Common directives include:
- `.word`: Defines a 32-bit integer.
- `.half`: Defines a 16-bit integer.
- `.byte`: Defines an 8-bit integer.

Example:
```asm
.data
    dataword: .word 9486734     ; 32-bit integer max(4294967295)
    datahalf: .half 12345       ; 16-bit integer max(65535)
    databyte: .byte 233         ; 8-bit integer max(255)
```

#### Comments
Comments are preceded by a `;` symbol and are ignored by the assembler. Use comments to document your code.

Example:
```asm
    ; This is a comment
    li $t0, 10  ; Load the value 10 into register $t0
```

#### Labels
Labels are identifiers followed by a colon (`:`). They mark locations in the code or data for reference. Each label must be unique and reside on its own line. Labels are case-sensitive and can contain letters, numbers, and underscores.

Example:
```asm
loop:                       ; Label for a loop
    addi $t0, $t0, -1       ; Decrement $t0
    bnez $t0, loop          ; Branch if $t0 is not zero
```

#### Instructions
Instructions are the commands executed by the CPU. They consist of an operation (e.g., `add`, `sub`) and operands (e.g., registers, immediate values).

Example:
```asm
    add $t0, $t1, $t2           ; Add $t1 and $t2, store result in $t0
```

> **Tip:** Use the Monaco Editor's autocomplete and info widgets to assist with writing and understanding instructions.


## Simulator controls
The **Simulator Controls** are located at the top of the editor and provide essential functionalities for managing the simulation process. Below is a detailed overview of each control:
- **Assemble and load**: Assembles the program and loads it into memory. This action also clears any previous program data and resets the program counter to the starting point.
- **Run**: Executes the program from the current instruction until completion or a breakpoint is reached. The program will stop automatically if it encounters an error or reaches the end of the code.
- **Pause**: Temporarily halts the simulation. This is useful for inspecting the current state of the program without stopping it completely.
- **Resume**: Resumes the simulation from the current instruction. This is useful after pausing the simulation to inspect the program's state.
- **Stop**: Halts the simulation and resets the program counter to the starting point. This action also clears all registers and memory, functioning similarly to the reset option.
- **Step**: Executes one cycle of the CPU, allowing you to observe the program's behavior step by step. This is particularly useful for debugging and understanding how the program operates.
- **Speed**: Controls the simulation speed using a slider. The speed can range from 1 instruction per second to 100 instructions per second. At the maximum setting of 100 instructions per second, the simulation runs at full speed, constrained only by the performance of the host machine. By default, the speed is set to 10 instructions per second.


## CPU Diagram

The **CPU Diagram** offers a visual representation of the CPU's architecture, showcasing its components and their interconnections. Above the diagram, there are color-coded stages that display the instructions currently flowing through each stage of the pipeline. These stages provide a clear and intuitive view of the CPU's execution process, helping you track the progress of instructions in real-time.

You can hover over each component in the diagram to view its name, description, and port values. The components are represented using distinct symbols to indicate their types:

- **Program Counter (PC)**: Depicted as a rectangle with a triangle, it holds the address of the next instruction to be executed.
- **Stage Registers**: Shown as tall rounded rectangles, these registers store the current state of the CPU's execution stages.
- **Arithmetic Logic Unit (ALU)**: Represented as a rectangle, it performs arithmetic and logical operations.
- **Storage Units**: Illustrated as rectangles, these components store data, instructions, and registers.
- **Control Unit**: Depicted as a rounded rectangle, it manages the CPU's operations and coordinates instruction execution.
- **Multiplexer**: Shown as a small rounded rectangle, it selects one of several input signals and forwards the chosen input to a single output line.
- **Logic Gates**: Represented by standard ANSI symbols, these components perform basic logical operations on binary inputs to produce a single binary output.
- **Operations**: Conceptual actions such as "shift left" or "sign extend" are represented by dashed circles.

The diagram also includes wires that indicate the flow of data and control signals between components. These wires are highlighted when a non-zero value flows through them:
- **Solid Lines**: Represent data flow between components.
- **Dashed Lines**: Represent control signals that manage component operations.

Each port displays its current value, reflecting the real-time state of the simulation. This feature can be disabled in the project settings. By default, values are shown in decimal format, but you can switch to hexadecimal or binary as needed in the project settings.

## Registers

The **Registers Panel** offers a real-time view of the CPU registers, a fundamental component of the MIPS architecture. This architecture features 32 general-purpose registers, each 32 bits wide, used for tasks such as holding temporary data, function arguments, return values, and pointers.

### Display Customization
You can customize the register display format in the project settings, choosing between **decimal**, **hexadecimal**, or **binary**. By default, registers are displayed in decimal format. To improve usability, any register that changes its value is automatically highlighted, making it easier to track updates during program execution.

### Editability
Registers are editable directly from the **Registers Panel** by clicking on them, allowing you to modify their values during simulation. However, the **Program Counter (PC)** and the `$zero` register (or `$0`) are not editable, as they serve specific purposes in the architecture.

### Register Naming

Registers can be referenced using either the `$` or `R` prefix and identified through two naming schemes:
- **Simple** (numeric): e.g., `$0` or `R0`
- **Advanced** (descriptive): e.g., `$zero` or `Rzero`

For example:
- `$0` or `R0` corresponds to `$zero` or `Rzero`.
- `$1` or `R1` corresponds to `$at` or `Rat`.

> You can adjust your preferred naming scheme in the project settings.



### Register Overview
Below is a table summarizing the register names and their typical purposes:

| Register Number | Name      | Description              |
| --------------- | --------- | ------------------------ |
| `$0`            | `$zero`   | Constant value `0`       |
| `$1`            | `$at`     | Assembler temporary      |
| `$2-$3`         | `$v0-$v1` | Function return values   |
| `$4-$7`         | `$a0-$a3` | Function arguments       |
| `$8-$15`        | `$t0-$t7` | Temporary registers      |
| `$16-$23`       | `$s0-$s7` | Saved registers          |
| `$24-$25`       | `$t8-$t9` | More temporary registers |
| `$26-$27`       | `$k0-$k1` | Reserved for OS kernel   |
| `$28`           | `$gp`     | Global pointer           |
| `$29`           | `$sp`     | Stack pointer            |
| `$30`           | `$fp`     | Frame pointer            |
| `$31`           | `$ra`     | Return address           |

> **Note:** The current assembler implementation does not treat any registers as special. You can use any number or name for your registers as needed.

---

## Data Memory

The **Memory Panel** provides a visual representation of the system's memory state. In the MIPS architecture, the address space is 32-bit, theoretically allowing access to up to 4 GB of memory. However, MIPStream supports a configurable memory size, adjustable in the project settings. By default, the memory size is set to **256 bytes**, expandable up to **4 KB**.

### Features
- Each memory cell represents a single byte.
- Users can click on any cell to modify its value directly.
- Memory contents are cleared upon every program load.

> **Note:** Memory is byte-addressable, but no currently implemented CPU model utilizes this functionality. Future updates may expand on this feature.

---

## Instruction Memory

The **Instruction Memory Panel** displays the assembled program's instructions in a table format, including:
- **Address**: The memory address of the instruction.
- **Hexadecimal Encoding**: The encoded instruction in hexadecimal format.
- **Code Line**: The corresponding line of code.

During simulation, each row is highlighted to indicate the current stage of the instruction's execution.


## Instructions Panel
The **Instructions Panel** provides a informative view of the instruction supported by the current CPU model. It includes:
- **Mnemonic**: The instruction's mnemonic representation.
- **Description**: A brief explanation of the instruction's purpose and functionality.
- **Format**: The instruction format (e.g., R-type, I-type, J-type).
- **Example**: A practical example of the instruction's usage, including the expected output.
- **Pseudo Code**: A simplified representation of the instruction's operation, using a high-level language syntax.




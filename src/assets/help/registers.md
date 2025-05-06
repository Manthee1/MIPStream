# Registers Help Documentation

Registers in this system can be referred to using either the `$` or `R` prefix. Additionally, registers can be identified using two naming schemes: **Simple** (numeric) or **Advanced** (descriptive). For example:
- `$0` or `R0` can also be referred to as `$zero` or `Rzero`.
- `$1` or `R1` can also be referred to as `$at` or `Rat`.

Below is the full table of register names and their proposed purposes:

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

Use the naming scheme that best suits your needs for clarity and readability.
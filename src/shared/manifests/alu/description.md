# ALU
The Arithmetic Logic Unit performs the datapath's computation.

## Operations (4-bit control)
| Code | Operation |
|------|-----------|
| `0000` | AND |
| `0001` | OR |
| `0010` | Add |
| `0110` | Subtract |
| `0111` | Set-on-less-than (signed) |
| `1100` | NOR |

## Outputs
- **Result**: the computed word.
- **Zero**: asserted when the result is `0` — used by branch comparisons.

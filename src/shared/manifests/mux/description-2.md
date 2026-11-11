# Mux 2:1
A 2-input multiplexer: `Sel` (1 bit) selects one of `In 0`–`In 1` onto `Out`. The input count is fixed; the bus width is configurable.

## Configuration
- **Selection assignment**: which input is forwarded for each selector value — the code drawn beside every input pin ("0" or "1"). Picking an occupied code swaps the two inputs.
- **Selector position**: hang the `Sel` pin below or above the data inputs.

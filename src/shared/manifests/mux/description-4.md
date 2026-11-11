# Mux 4:1
A 4-input multiplexer: `Sel` (2 bits) selects one of `In 0`–`In 3` onto `Out`. The input count is fixed; the bus width is configurable.

## Configuration
- **Selection assignment**: which input is forwarded for each selector value — the code drawn beside every input pin ("00"–"11"). Picking an occupied code swaps the two inputs.
- **Selector position**: hang the `Sel` pin below or above the data inputs.

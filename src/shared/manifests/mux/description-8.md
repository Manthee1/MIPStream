# Mux 8:1
An 8-input multiplexer: `Sel` (3 bits) selects one of `In 0`–`In 7` onto `Out`. The input count is fixed; the bus width is configurable.

## Configuration
- **Selection assignment**: which input is forwarded for each selector value — the code drawn beside every input pin ("000"–"111"). Picking an occupied code swaps the two inputs.
- **Selector position**: hang the `Sel` pin below or above the data inputs.

# Mux 16:1
A 16-input multiplexer: `Sel` (4 bits) selects one of `In 0`–`In 15` onto `Out`. The input count is fixed; the bus width is configurable.

## Configuration
- **Selection assignment**: which input is forwarded for each selector value — the code drawn beside every input pin ("0000"–"1111"). Picking an occupied code swaps the two inputs.
- **Selector position**: hang the `Sel` pin below or above the data inputs.

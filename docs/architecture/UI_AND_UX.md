# Workspace Perspectives & Design Specs

## 1. Design Perspective (Architecture Editor)
- **Primary Tool**: Konva Canvas.
- **Wiring Logic**: 
  - Orthogonal routing (only 90-degree bends).
  - Junctions are created when a branch starts from an existing wire.
  - Strict 1-Output-to-N-Inputs rule enforced at the UI level.
- **Validation**: Real-time linting for bit-width mismatches (e.g., 32-bit output connected to 16-bit input).

## 2. Simulate Perspective (Runtime)
- **Locked Mode**: Canvas is read-only. No moving or deleting components.
- **Visual Feedback**:
  - Wires change color/thickness based on active values.
  - Hovering over a port shows its current value in Hex, Binary, and Decimal.
- **Panel Integration**: 
  - Panels (Registers, Memory) are dynamically mounted via **Golden Layout** based on the presence of specific module types on the canvas.

## 3. Documentation System
- Each `ModuleManifest` provides a `baseMarkdown`.
- The Editor allows overriding this with `instanceMarkdown` (e.g. "This specific register is the Program Counter").
- Tooltips render both, explaining both the "What" and the "Why".

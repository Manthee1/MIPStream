# MIPStream — Interactive CPU Diagram + Simulator

MIPStream is evolving into an interactive CPU microarchitecture editor and cycle-accurate simulator focused on visual diagram editing (like Logisim) and advanced branch prediction support. The project provides:

- A visual drag-and-drop datapath editor for composing ALUs, registers, MUXes, pipeline registers, and control logic.
- A cycle-accurate simulation engine supporting forwarding, stalling, and both static and dynamic branch prediction modes.
- Config-driven CPU descriptions (JSON) and example CPU configs under `config/examples/`.
- A verification harness to compare traces and final state with golden references.

See `docs/ROADMAP.md` for the new high-level plan and required codebase changes.

## License

This project is licensed under the MIT License. See `LICENSE`.
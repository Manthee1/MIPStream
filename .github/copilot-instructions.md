<!-- @format -->

# Project Agent Context — Interactive CPU Simulator

Purpose

- Short: Educational, configurable CPU microarchitecture simulator (single-cycle + pipelined) with an interactive visual editor and verification harness.
- Audience: students, graders, and developers extending the simulator.

High-level goals (what the agent must enable the project to achieve)

- Load CPU configurations from JSON describing modular components (ALU, registers, MUX, pipeline registers, hazard units, predictors).
- Provide a cycle-accurate simulation engine supporting forwarding, stalling, full hazard detection, and static/dynamic branch prediction.
- Offer a visual editor to assemble datapath components and map control signals.
- Produce execution traces and metrics: cycles, CPI, stalls, branch miss rate, and other per-run diagnostics.
- Provide verification/testing harness to compare outputs against reference simulators or golden traces.

Agent persona & behavior constraints

- Tone: technical, concise, engineering-focused.
- Language: English
- Editing policy: never delete user files without explicit approval. Prefer additive edits and create clear changelog entries.
- Recommendations must be environment-agnostic: do not hardcode package managers, container configs, or specific host paths. The agent should propose options and let the workspace decide.

What the agent should do in its own environment

- Read this file to understand high-level project goals.
- Discover the workspace (files, build scripts, test assets) and infer the stack/tooling used.
- Propose a minimal, self-contained plan tailored to the detected stack (e.g., Node, Python, Rust). Each proposal should include required files, a small test harness, and suggested commands appropriate to that environment.
- When asked to implement, create minimal runnable changes: JSON schema, small engine module, or a test harness, plus a short README explaining how to run tests locally in that environment.

Onboarding checklist for the agent (sequence)

1. Read this file.
2. List missing/ambiguous items needed to run or test the simulator (dependencies, test vectors, build commands).
3. Propose 2–3 prioritized tasks the agent can implement that are self-contained and verifiable in the workspace.
4. Implement the selected task, run local checks or tests if possible, and report results.

Thesis-specific requirements the agent must respect

- Preserve thesis/academic formatting and references when editing LaTeX sources; avoid automatic large-scale format changes.
- Ensure the simulator design supports: one TTL/cycle visibility for pipelines, full hazard detection, and static/dynamic branch prediction modes.
- Document JSON component format and expected inputs/outputs for verification.

Suggested deliverables the agent can produce (pick based on workspace stack)

- JSON schema for CPU component descriptions and at least two example CPU configs.
- Minimal cycle-accurate core module (single-file) with an API for stepping cycles and emitting trace lines.
- A verification harness that runs a CPU config on a set of instruction streams and emits a diff vs expected register/memory state.
- Short README and small run/test commands tailored to the environment discovered by the agent.

Reporting style and expectations

- Use concise progress updates and short change summaries.
- For each edit, produce a one-line changelog and a short instruction to run local checks.
- When making recommendations, list trade-offs and an estimate of implementation effort.

Safety, reproducibility, and collaboration

- Add tests where reasonable and keep them fast and deterministic.
- Version important configuration (JSON examples, schema) and add them under a `config/examples/` folder.
- If a change could affect the thesis source, flag it for manual review and do not alter without explicit approval.

How to request tailoring

- Ask the agent: “Tailor this to my stack” and include which stack (Node, Python, Rust, etc.), CI preferences, and whether LaTeX build should be automated.

Notes

- This file intentionally avoids environment-specific commands; the agent should detect the workspace tooling and then provide concrete commands tailored to that environment.

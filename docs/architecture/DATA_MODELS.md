# System Data Model & Type Hierarchy

The project distinguishes between three representations of the same architecture to optimize for storage, interactive editing, and raw simulation speed.

## 1. Persistence Layer (Serialized)
Flat, JSON-safe structures designed for database storage and file export. This layer uses stable string identifiers for all cross-references between modules and nets. It captures the physical layout (coordinates) and the logical configuration (parameters) without any runtime overhead or circular references.

## 2. Interactive Layer (Hydrated)
Rich, reactive objects used by the Vue 3 frontend and Konva canvas. This layer merges the raw serialized data with the functional manifests. It manages:
- Visual states (selection, dragging, validation errors).
- Dynamic port generation based on module configuration.
- Educational metadata and documentation strings for tooltips.
- Real-time linting results for bit-width and connectivity checks.

## 3. Performance Layer (Runtime)
Stripped-down, pointer-heavy structures optimized for the simulation loop. At this level, all string-based IDs are resolved into direct indices into the global memory buffers. This layer ignores visual coordinates and focus entirely on the mathematical evaluation of logic gates and the timing of clock edges.

# Project Architecture & Code Style Guide

## 1. Abstraction & Logic Separation

- **Default to Composables**: All reusable state, side-effects, engine triggers, or non-UI logic must be extracted into dedicated Vue composables in `src/composables/` or domain-specific logic files.
- **Lean `App.vue`**: The root component must remain minimal. Keep it strictly to top-level setup, provider wrappers (e.g., Naive UI `NConfigProvider`), and layout entry points.
- **Clean Application Entry Point**: Plugin registrations and global configurations in `main.ts` should be abstracted into initialization modules where possible.

## 2. UI & Component Strategy

- **Naive UI First**: Prefer [Naive UI](https://www.naiveui.com/) components for all UI elements (Buttons, Dropdowns, Dialogs, Tooltips, etc.) to ensure a consistent, professional design system.
- **Tabler Icons**: All iconography must use [Tabler Icons](https://tabler-icons.io/vue) (`@tabler/icons-vue`).
- **Component Granularity**: Break large UI trees into smaller, single-responsibility components. If a template exceeds ~200 lines, it is a candidate for decomposition.
- **Tailwind Utility-First**: Use Tailwind CSS v4 utility classes exclusively for custom layout, spacing, and minor stylistic tweaks. Writing raw `<style>` blocks or plain CSS is strictly forbidden unless required by third-party canvas library overrides (Konva).
- **Concise Class Lists**: Avoid unreadable inline class strings. Use `tailwind-merge` and `clsx` for conditional or complex class logic.
- **Theme Variables**: Use the custom theme tokens (`accent`, `surface-0` through `surface-5`) defined in `src/assets/index.css`. Ensure Naive UI theme is synced with these variables via `NConfigProvider`.

## 3. Utility Modules & Directory Structure

- **Categorized Utility Files**: Do not use a monolithic `utils.ts` or `helpers.ts`.
- **Domain Isolation**: Separate utilities logically into modular files based on their domain (e.g., `src/shared/utils/bit-ops.ts`, `src/shared/utils/formatters.ts`).
- **Single-Function Files**: Standalone, complex algorithms (like wiring logic or engine compilers) should be isolated into their own files.

## 4. Simulation & Performance Standards

- **The Engine Rule**: Do **NOT** use Vue `ref` or `reactive` inside the simulation evaluation loop or the core engine logic. The engine must remain pure TypeScript operating on `Uint32Array` buffers for performance.
- **Reactive Sampling**: The UI should sample the engine state at 60fps. Do not drive simulation cycles through Vue's reactivity system.

## 5. TypeScript Standards

- **Type Safety**: Avoid `any` at all costs. Use `interface` for extensible data structures and `type` for unions or aliases.
- **Naming Conventions**:
    - Vue Components: PascalCase (e.g., `ModuleNode.vue`)
    - Composables: camelCase with `use` prefix (e.g., `useEngine.ts`)
    - Utility/Logic files: kebab-case (e.g., `topological-sort.ts`)

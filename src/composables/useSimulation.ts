/** @format */

import { watch } from "vue";
import { SimulationEngine } from "@/core/engine/engine";
import type { ArchitectureDocument } from "@/core/engine/compile/compiler";
import { requestArchitectureSnapshot } from "@/editor/core/designer-bridge";
import { documentRevision } from "@/editor/core/selection-bridge";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore } from "@/stores/simulationStore";

/**
 * Single owner of the simulation engine lifecycle (STYLE_GUIDE §4):
 *
 * - The `SimulationEngine` instance lives at module scope — never inside Vue
 *   reactivity or Pinia state, so the `Uint32Array` hot path stays raw.
 * - `run()` drives cycles through `requestAnimationFrame` toward the store's
 *   target frequency; the UI samples the buffer on its own display-rate loop.
 * - The compiled program is invalidated whenever the schematic document
 *   changes (revision bump) and is rebuilt lazily on the next control call.
 */

let engine: SimulationEngine | null = null;
let compiledRevision = -1;
let frameRequestId: number | null = null;
let lastFrameTime = 0;
let cycleDebt = 0;

/** Compile source: the live designer document when a canvas is mounted, the
 *  stored architecture otherwise. */
function currentDocument(): ArchitectureDocument {
  const snapshot = requestArchitectureSnapshot();
  if (snapshot) return snapshot;

  const architecture = useProjectStore().currentProject?.architecture;
  return { modules: architecture?.modules ?? [], nets: architecture?.nets ?? [] };
}

/**
 * (Re)compiles the program when missing or stale. True when runnable; false
 * when compile errors block execution (reported through the store).
 */
export function ensureCompiled(): boolean {
  const store = useSimulationStore();

  if (engine && compiledRevision === documentRevision.value) {
    return !engine.hasErrors;
  }

  engine = new SimulationEngine(currentDocument());
  compiledRevision = documentRevision.value;
  store.setCompileReport(
    engine.errors.map((issue) => issue.message),
    engine.warnings.map((issue) => issue.message)
  );

  if (engine.hasErrors) {
    // A broken program cannot run; fall back to a halted session.
    stopLoop();
    store.setStatus("stopped");
    store.setCycleCount(0);
    return false;
  }

  // A fresh program starts from its initial state at cycle 0.
  store.setCycleCount(0);
  return true;
}

// Any committed architecture edit invalidates the compiled program and
// pauses an active run — the next control call recompiles fresh.
watch(documentRevision, () => {
  if (frameRequestId !== null) {
    stopLoop();
    useSimulationStore().setStatus("paused");
  }
});

function startLoop(): void {
  if (frameRequestId !== null) return;
  lastFrameTime = performance.now();
  frameRequestId = requestAnimationFrame(runFrame);
}

function stopLoop(): void {
  if (frameRequestId !== null) {
    cancelAnimationFrame(frameRequestId);
    frameRequestId = null;
  }
  cycleDebt = 0;
}

/** One animation frame of continuous execution: N engine steps, never Vue-driven. */
function runFrame(now: number): void {
  frameRequestId = null;
  const store = useSimulationStore();
  const activeEngine = engine;
  if (!activeEngine || store.status !== "running") return;

  const elapsedSeconds = Math.max(0, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  // Accrue fractional cycles so slow speeds still advance evenly.
  cycleDebt += elapsedSeconds * store.speed;
  let cycles = Math.floor(cycleDebt);
  // Cap the frame budget at one second of cycles so a long background stall
  // never freezes the tab catching up.
  const frameBudget = Math.max(1, store.speed);
  if (cycles > frameBudget) cycles = frameBudget;
  cycleDebt -= cycles;

  for (let i = 0; i < cycles; i++) activeEngine.step();

  store.setCycleCount(activeEngine.cycleCount);
  frameRequestId = requestAnimationFrame(runFrame);
}

/**
 * Starts or resumes continuous execution. True when running; false when
 * compile errors block it (see `simulationStore.compileErrors`).
 */
export function run(): boolean {
  const store = useSimulationStore();
  if (store.status === "running") return true;
  if (!ensureCompiled()) return false;

  store.setStatus("running");
  startLoop();
  return true;
}

/** Pauses a running simulation at the current cycle. */
export function pause(): boolean {
  const store = useSimulationStore();
  if (store.status !== "running") return false;

  stopLoop();
  store.setStatus("paused");
  return true;
}

/**
 * Halts the session and rewinds to the initial compiled state (fresh
 * registers/memory, cycle 0). Enabled while running or paused.
 */
export function stop(): boolean {
  const store = useSimulationStore();
  if (store.status === "stopped") return false;

  stopLoop();
  engine?.reset();
  store.setStatus("stopped");
  store.setCycleCount(0);
  return true;
}

/**
 * Executes exactly one master clock cycle; only while not running.
 * Enters the paused state (SIMULATOR_OVERVIEW §4: step keeps the program paused).
 */
export function step(): boolean {
  const store = useSimulationStore();
  if (store.status === "running") return false;
  if (!ensureCompiled()) return false;

  const activeEngine = engine;
  if (!activeEngine) return false;

  activeEngine.step();
  store.setStatus("paused");
  store.setCycleCount(activeEngine.cycleCount);
  return true;
}

/** Live engine for read-only sampling (null before the first compile). */
export function getEngine(): SimulationEngine | null {
  return engine;
}

/**
 * Component-facing simulation API. All engine mutation funnels through the
 * module-scope functions above; the store mirrors status for the UI.
 */
export function useSimulation() {
  return {
    run,
    pause,
    stop,
    step,
    ensureCompiled,
    getEngine,
  };
}


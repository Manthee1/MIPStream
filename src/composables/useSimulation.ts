/** @format */

import { watch } from "vue";
import { SimulationEngine } from "@/core/engine/engine";
import type { ArchitectureDocument } from "@/core/engine/compile/compiler";
import { buildLoadPlan, scanSimulationTargets, type BuiltPlan } from "@/core/simulation/program-loader";
import { SimulationSession } from "@/core/simulation/simulation-session";
import { requestArchitectureSnapshot } from "@/editor/core/designer-bridge";
import { documentRevision } from "@/editor/core/selection-bridge";
import { useProjectStore } from "@/stores/projectStore";
import { useSimulationStore, type LoadedProgramSnapshot } from "@/stores/simulationStore";

/**
 * Single owner of the simulation session lifecycle (STYLE_GUIDE §4) — the
 * thin Vue adapter over the framework-free control state machine
 * (`src/core/simulation/simulation-session.ts`):
 *
 * - The `SimulationSession` (and its engine) lives at module scope — never
 *   inside Vue reactivity or Pinia state, so the `Uint32Array` hot path
 *   stays raw.
 * - `runFrame` drives cycles through `requestAnimationFrame` toward the
 *   store's target frequency via `session.advance()`; the UI samples the
 *   buffer on its own display-rate loop.
 * - The compiled engine is invalidated whenever the schematic document
 *   changes (revision bump) and is rebuilt lazily on the next control call;
 *   a loaded program is dropped with it (status → `unloaded`).
 */

let session: SimulationSession | null = null;
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

/** Mirrors the session (or its absence) into the store. */
function mirrorSession(): void {
  const store = useSimulationStore();
  store.setStatus(session?.status ?? "unloaded");
  store.setCycleCount(session?.cycleCount ?? 0);
}

/**
 * (Re)compiles the engine when missing or stale. True when runnable; false
 * when compile errors block execution (reported through the store). A
 * recompile discards any loaded program — the session starts fresh.
 */
export function ensureCompiled(): boolean {
  const store = useSimulationStore();

  if (session && compiledRevision === documentRevision.value) {
    return !session.engine.hasErrors;
  }

  const engine = new SimulationEngine(currentDocument());
  compiledRevision = documentRevision.value;
  store.setCompileReport(
    engine.errors.map((issue) => issue.message),
    engine.warnings.map((issue) => issue.message)
  );

  if (engine.hasErrors) {
    // A broken netlist cannot run; fall back to a halted session.
    stopLoop();
    session = null;
    store.setStatus("stopped");
    store.setCycleCount(0);
    return false;
  }

  session = new SimulationSession(engine, scanSimulationTargets(currentDocument()));
  mirrorSession();
  return true;
}

/** Assembles the mapped editors into a load plan for the current session. */
function buildCurrentPlan(): BuiltPlan | null {
  const project = useProjectStore().currentProject;
  if (!project || !session) return null;
  return buildLoadPlan({
    configuration: project.architecture.configuration,
    editors: project.software.editors,
    targets: session.simulationTargets,
  });
}

/** True when any editor's source changed since the program was loaded. */
function sourcesChanged(): boolean {
  if (!session) return false;
  const editors = useProjectStore().currentProject?.software.editors ?? [];
  const loaded = session.loadedSources;
  if (editors.length !== loaded.size) return true;
  return editors.some((entry) => loaded.get(entry.id) !== entry.sourceCode);
}

// Any committed architecture edit invalidates the compiled engine and the
// loaded program — the next control call recompiles fresh. The load-time
// pcLineMaps go stale with the program.
watch(documentRevision, () => {
  stopLoop();
  session = null;
  compiledRevision = -1;
  useSimulationStore().setLoadedPrograms({});
  mirrorSession();
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
  const activeSession = session;
  if (!activeSession || store.status !== "running") return;

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

  activeSession.advance(cycles);
  store.setCycleCount(activeSession.cycleCount);

  // The program finished: stop by itself and report the completion cycle.
  if (activeSession.status === "finished") {
    store.setHaltedAtCycle(activeSession.cycleCount);
    return;
  }

  frameRequestId = requestAnimationFrame(runFrame);
}

// --------------------------------------------------------------- control API

/** Stores a built plan's load report; true when the load succeeded. */
function reportLoad(built: BuiltPlan, ok: boolean, loadErrors: string[]): boolean {
  const store = useSimulationStore();
  store.setLoadReport([...built.loadErrors, ...loadErrors], built.plan.assemblerDiagnostics);
  store.setHaltedAtCycle(null);
  // Load-time program snapshots exist only for a successful load — they drive
  // the current-instruction highlight and the stage instruction visualizer.
  const programs: Record<string, LoadedProgramSnapshot> = {};
  if (ok) {
    for (const entry of built.plan.entries) {
      // Flatten the assembled instruction words (image order) so the stage
      // visualizer can match registers that latch the encoded word itself.
      const instructionWords: number[] = [];
      for (const image of entry.imemImages.values()) {
        for (let index = 0; index < image.length; index += 1) instructionWords.push(image[index]);
      }
      programs[entry.editorId] = {
        pcLineMap: entry.pcLineMap,
        sourceLines: entry.source.replace(/\r\n?/g, "\n").split("\n"),
        instructionWords,
      };
    }
  }
  store.setLoadedPrograms(programs);
  mirrorSession();
  return ok;
}

/**
 * Load Program: assemble every mapped editor, write the images into the
 * engine's memories, and pause at instruction 0. True when a program is
 * loaded; failures surface through `simulationStore.loadErrors` and
 * `simulationStore.assemblerDiagnostics`.
 */
export function loadProgram(): boolean {
  if (!ensureCompiled()) return false;
  const built = buildCurrentPlan();
  if (!built || !session) return false;

  stopLoop();
  const report = session.load(built.plan);
  return reportLoad(built, report.ok, report.loadErrors);
}

/**
 * Start Program: resume when paused; otherwise assemble, load and run the
 * current source (spec: "assembles/loads code and immediately begins").
 */
export function startProgram(): boolean {
  if (!ensureCompiled() || !session) return false;

  if (session.status !== "paused" && session.status !== "running") {
    const built = buildCurrentPlan();
    if (!built) return false;
    const report = session.load(built.plan);
    if (!reportLoad(built, report.ok, report.loadErrors)) return false;
  }

  if (!session.start()) return false;
  const store = useSimulationStore();
  store.setHaltedAtCycle(null);
  store.setStatus("running");
  startLoop();
  return true;
}

/** Pause Program: halts continuous execution at the current cycle. */
export function pauseProgram(): boolean {
  if (!session?.pause()) return false;
  stopLoop();
  mirrorSession();
  return true;
}

/**
 * Stop Program: terminates the session. State (registers, memory, cycle
 * count) is preserved for inspection; only Load/Start/Restart rebuild it.
 */
export function stopProgram(): boolean {
  if (!session?.stop()) return false;
  stopLoop();
  mirrorSession();
  return true;
}

/**
 * Next Step: executes one clock cycle and re-pauses. Auto-loads first when
 * no program is loaded yet (equivalent to Load + Step — this is also what
 * keeps mapping-less netlists steppable); rejected while running/finished.
 */
export function stepProgram(): boolean {
  if (!ensureCompiled() || !session) return false;

  if (session.status === "unloaded" || session.status === "stopped") {
    const built = buildCurrentPlan();
    if (!built) return false;
    const report = session.load(built.plan);
    if (!reportLoad(built, report.ok, report.loadErrors)) return false;
  }

  const result = session.step();
  if (result === null) return false;
  const store = useSimulationStore();
  if (result === "finished") store.setHaltedAtCycle(session.cycleCount);
  store.setStatus(result);
  store.setCycleCount(session.cycleCount);
  return true;
}

/**
 * Restart Program: rewind to the loaded state (fresh registers/memory,
 * images re-applied, paused at instruction 0). Re-assembles only when the
 * source changed since the last load.
 */
export function restartProgram(): boolean {
  if (!ensureCompiled() || !session) return false;
  if (!session.hasProgram || session.status === "stopped" || session.status === "unloaded") {
    return false;
  }

  stopLoop();
  if (sourcesChanged()) {
    const built = buildCurrentPlan();
    if (!built) return false;
    const report = session.load(built.plan);
    return reportLoad(built, report.ok, report.loadErrors);
  }
  if (!session.restart()) return false;
  const store = useSimulationStore();
  store.setHaltedAtCycle(null);
  mirrorSession();
  return true;
}

/** Live engine for read-only sampling (null before the first compile). */
export function getEngine(): SimulationEngine | null {
  return session?.engine ?? null;
}

/**
 * Live program counter of the loaded session (byte address, the `std.pc` q
 * port), or null when nothing is loaded / no PC exists. The instruction
 * index is `pc >>> 2` — the same contract halt detection uses.
 */
export function getProgramCounter(): number | null {
  if (!session?.hasProgram) return null;
  const designator = session.simulationTargets.pcDesignator;
  if (designator === null) return null;
  return session.engine.getPortValue(designator, "q");
}

/**
 * Component-facing simulation API. All engine mutation funnels through the
 * module-scope functions above; the store mirrors status for the UI.
 */
export function useSimulation() {
  return {
    loadProgram,
    startProgram,
    pauseProgram,
    stopProgram,
    stepProgram,
    restartProgram,
    ensureCompiled,
    getEngine,
  };
}


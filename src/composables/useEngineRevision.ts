import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useSimulationStore } from '@/stores/simulationStore';

/**
 * Engine-driven revision counter for manifest panels (the `ModulePanelProps`
 * sampling contract): a display-rate loop bumps the counter whenever the
 * simulation advanced (status or cycle count changed) — between engine steps
 * the raw typed-array state cannot change, so idle 60fps re-renders are
 * skipped. `bump()` covers panel-initiated mutations (panels mutate the
 * shared buffers directly and emit `update` afterwards).
 */
export function useEngineRevision() {
  const revision = ref(0);
  let frameRequestId: number | null = null;
  let lastKey = '';

  function frame(): void {
    frameRequestId = null;
    const store = useSimulationStore();
    const key = `${store.status}:${store.cycleCount}`;
    if (key !== lastKey) {
      lastKey = key;
      revision.value++;
    }
    frameRequestId = requestAnimationFrame(frame);
  }

  onMounted(() => {
    frameRequestId = requestAnimationFrame(frame);
  });

  onBeforeUnmount(() => {
    if (frameRequestId !== null) {
      cancelAnimationFrame(frameRequestId);
      frameRequestId = null;
    }
  });

  /** Forces a re-render (e.g. after a panel edited the shared buffers). */
  function bump(): void {
    revision.value++;
  }

  return { revision, bump };
}
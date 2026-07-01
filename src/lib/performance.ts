export type PerformanceMeasurement = {
  label: string;
  durationMs: number;
  createdAt: string;
};

declare global {
  var __vinpopPerformanceMeasurements: PerformanceMeasurement[] | undefined;
}

function measurements() {
  globalThis.__vinpopPerformanceMeasurements ??= [];
  return globalThis.__vinpopPerformanceMeasurements;
}

export async function timeAsync<T>(label: string, work: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    const entry = {
      label,
      durationMs: Math.round(performance.now() - startedAt),
      createdAt: new Date().toISOString(),
    };
    const list = measurements();
    list.unshift(entry);
    list.splice(80);
    console.info(`[vinpop:perf] ${entry.label} ${entry.durationMs}ms`);
  }
}

export function getRecentPerformanceMeasurements() {
  return measurements();
}

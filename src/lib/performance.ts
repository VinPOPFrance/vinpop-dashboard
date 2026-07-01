export type PerformanceMeasurement = {
  label: string;
  durationMs: number;
  createdAt: string;
  category: 'page' | 'helper' | 'other';
  cacheStatus: 'hit' | 'miss' | 'unknown' | 'none';
  rowCount: number | null;
  failed: boolean;
};

export type PerformanceSummary = {
  label: string;
  category: 'page' | 'helper' | 'other';
  callCount: number;
  averageDurationMs: number;
  lastDurationMs: number;
  maxDurationMs: number;
  lastSeenAt: string;
  cacheStatus: 'hit' | 'miss' | 'unknown' | 'none';
  lastRowCount: number | null;
};

type TimeAsyncOptions<T> = {
  category?: 'page' | 'helper' | 'other';
  cacheStatus?: 'hit' | 'miss' | 'unknown' | 'none';
  rowCount?: (result: T) => number | null;
};

declare global {
  var __vinpopPerformanceMeasurements: PerformanceMeasurement[] | undefined;
}

function measurements() {
  globalThis.__vinpopPerformanceMeasurements ??= [];
  return globalThis.__vinpopPerformanceMeasurements;
}

function inferCategory(label: string): 'page' | 'helper' | 'other' {
  if (label.startsWith('page:')) return 'page';
  if (label.startsWith('helper:')) return 'helper';
  return 'other';
}

export async function timeAsync<T>(label: string, work: () => Promise<T>, options?: TimeAsyncOptions<T>): Promise<T> {
  const startedAt = performance.now();
  let result: T | undefined;
  let failed = false;

  try {
    result = await work();
    return result;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const category = options?.category ?? inferCategory(label);
    const rowCount = result !== undefined && options?.rowCount ? options.rowCount(result) : null;
    const cacheStatus = options?.cacheStatus ?? 'none';
    const entry = {
      label,
      durationMs: Math.round(performance.now() - startedAt),
      createdAt: new Date().toISOString(),
      category,
      cacheStatus,
      rowCount,
      failed,
    };
    const list = measurements();
    list.unshift(entry);
    list.splice(80);
    const cacheNote = entry.cacheStatus !== 'none' ? ` cache=${entry.cacheStatus}` : '';
    const rowsNote = entry.rowCount !== null ? ` rows=${entry.rowCount}` : '';
    const failureNote = entry.failed ? ' failed=true' : '';
    console.info(`[vinpop:perf] ${entry.label} ${entry.durationMs}ms${cacheNote}${rowsNote}${failureNote}`);
  }
}

export function getRecentPerformanceMeasurements() {
  return measurements();
}

export function getPerformanceSummaries() {
  const map = new Map<string, PerformanceSummary & { totalDurationMs: number }>();

  for (const entry of measurements()) {
    const existing = map.get(entry.label);
    if (!existing) {
      map.set(entry.label, {
        label: entry.label,
        category: entry.category,
        callCount: 1,
        averageDurationMs: entry.durationMs,
        lastDurationMs: entry.durationMs,
        maxDurationMs: entry.durationMs,
        lastSeenAt: entry.createdAt,
        cacheStatus: entry.cacheStatus,
        lastRowCount: entry.rowCount,
        totalDurationMs: entry.durationMs,
      });
      continue;
    }

    existing.callCount += 1;
    existing.totalDurationMs += entry.durationMs;
    existing.averageDurationMs = Math.round(existing.totalDurationMs / existing.callCount);
    if (entry.createdAt >= existing.lastSeenAt) {
      existing.lastSeenAt = entry.createdAt;
      existing.lastDurationMs = entry.durationMs;
      existing.cacheStatus = entry.cacheStatus;
      existing.lastRowCount = entry.rowCount;
      existing.category = entry.category;
    }
    if (entry.durationMs > existing.maxDurationMs) {
      existing.maxDurationMs = entry.durationMs;
    }
  }

  return Array.from(map.values())
    .map((summary) => ({
      label: summary.label,
      category: summary.category,
      callCount: summary.callCount,
      averageDurationMs: summary.averageDurationMs,
      lastDurationMs: summary.lastDurationMs,
      maxDurationMs: summary.maxDurationMs,
      lastSeenAt: summary.lastSeenAt,
      cacheStatus: summary.cacheStatus,
      lastRowCount: summary.lastRowCount,
    }))
    .sort((a, b) => b.averageDurationMs - a.averageDurationMs);
}

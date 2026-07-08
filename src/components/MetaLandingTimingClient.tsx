'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { formatNumber } from '@/lib/format';

type LandingDay = {
  date: string;
  arrivals: number;
};

type LandingHour = {
  hour: number;
  arrivals: number;
};

type LandingWeekday = {
  weekday: string;
  weekdayIndex: number;
  arrivals: number;
};

type LandingTimingResponse =
  | {
      ok: true;
      metrics: {
        totalArrivals: number;
        topDay: LandingDay | null;
        topHour: LandingHour | null;
        daily: LandingDay[];
        byHour: LandingHour[];
      };
    }
  | {
      ok: false;
      reason: string;
    };

export function MetaLandingTimingClient({
  period,
  label,
}: {
  period: string;
  label: string;
}) {
  const [data, setData] = useState<LandingTimingResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/meta/landing-timing?period=${encodeURIComponent(period)}`, {
          cache: 'no-store',
        });
        const json = (await response.json()) as LandingTimingResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, reason: 'connection-failed' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const metrics = data?.ok ? data.metrics : null;
  const hourlyBuckets = metrics?.byHour.length
    ? metrics.byHour
    : Array.from({ length: 24 }, (_, hour) => ({ hour, arrivals: 0 }));
  const weekdayBuckets = useMemo(() => {
    const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const base = weekdayLabels.map((weekday, weekdayIndex) => ({ weekday, weekdayIndex, arrivals: 0 }));

    for (const row of metrics?.daily ?? []) {
      const weekdayIndex = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      base[weekdayIndex].arrivals += row.arrivals;
    }

    return base;
  }, [metrics]);
  const bestWeekday = useMemo(() => {
    return weekdayBuckets.reduce<LandingWeekday | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);
  }, [weekdayBuckets]);

  return (
    <PageSection>
      <SectionTitle sub={`Landing page arrivals by weekday and hour · ${label}`}>Landing Page Timing</SectionTitle>
      <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
          This shows the strongest weekdays and hours for landing page arrivals, so you can decide whether to run ads all week or only in specific windows.
        </p>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <MetricCard label="Best weekday" value={bestWeekday && bestWeekday.arrivals > 0 ? `${bestWeekday.weekday} (${formatNumber(bestWeekday.arrivals)})` : 'No data'} />
        <MetricCard label="Best hour" value={metrics?.topHour ? `${metrics.topHour.hour.toString().padStart(2, '0')}:00 (${formatNumber(metrics.topHour.arrivals)})` : 'No data'} />
        <MetricCard label="Total arrivals" value={metrics ? formatNumber(metrics.totalArrivals) : 'No data'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card>
          <SectionTitle>Arrivals by weekday</SectionTitle>
          {weekdayBuckets.some((row) => row.arrivals > 0) ? (
            <BarChart
              data={weekdayBuckets.map((row) => ({ label: row.weekday, value: row.arrivals, color: '#2D6A4F' }))}
              valueFormatter={(value) => formatNumber(value)}
            />
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No weekday timing data yet.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Arrivals by hour</SectionTitle>
          <BarChart
            data={hourlyBuckets.map((row) => ({
              label: `${row.hour.toString().padStart(2, '0')}:00`,
              value: row.arrivals,
              color: '#722F37',
            }))}
            valueFormatter={(value) => formatNumber(value)}
          />
        </Card>
      </div>
    </PageSection>
  );
}

'use client';

import { useEffect, useState } from 'react';
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

  return (
    <PageSection>
      <SectionTitle sub={`Landing page arrivals by day and hour · ${label}`}>Landing Page Timing</SectionTitle>
      <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
          This shows the best day and best hour for landing page arrivals, so you can decide whether to run ads all day or only in strong windows.
        </p>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <MetricCard label="Best day" value={metrics?.topDay ? `${metrics.topDay.date} (${formatNumber(metrics.topDay.arrivals)})` : 'No data'} />
        <MetricCard label="Best hour" value={metrics?.topHour ? `${metrics.topHour.hour.toString().padStart(2, '0')}:00 (${formatNumber(metrics.topHour.arrivals)})` : 'No data'} />
        <MetricCard label="Total arrivals" value={metrics ? formatNumber(metrics.totalArrivals) : 'No data'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card>
          <SectionTitle>Arrivals by day</SectionTitle>
          {metrics?.daily.length ? (
            <BarChart
              data={metrics.daily.map((row) => ({ label: row.date, value: row.arrivals, color: '#2D6A4F' }))}
              valueFormatter={(value) => formatNumber(value)}
            />
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No landing page timing data yet.</p>
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

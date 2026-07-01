import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { formatDate, formatNumber } from '@/lib/format';
import { getRecentPerformanceMeasurements, type PerformanceMeasurement } from '@/lib/performance';

export const runtime = 'nodejs';

type PerfRow = PerformanceMeasurement & Record<string, unknown>;

const columns: SortableColumn<PerfRow>[] = [
  { key: 'createdAt', label: 'Logged at', type: 'date', width: 140 },
  { key: 'label', label: 'Helper / page', type: 'text', width: 360 },
  { key: 'durationMs', label: 'Duration ms', type: 'number' },
];

export default async function PerformanceDiagnosticsPage() {
  await connection();
  const measurements = getRecentPerformanceMeasurements();
  const slowest = [...measurements].sort((a, b) => b.durationMs - a.durationMs)[0] ?? null;
  const average = measurements.length ? measurements.reduce((sum, row) => sum + row.durationMs, 0) / measurements.length : 0;

  return (
    <DashboardLayout>
      <TopBar title="Performance Diagnostics" subtitle="Recent server-side helper timings and navigation bottlenecks" />
      <PageSection>
        <SectionTitle sub="In-memory process log. Resets on server restart or new serverless instance.">Recent Performance</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Lightweight diagnostics only. This page does not query Shopify, Meta, or customer data.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            The sidebar already disables route prefetching. Heavy protected pages now log server helper durations, and loading states cover the slow routes while data is being prepared.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <MetricCard label="Measurements" value={formatNumber(measurements.length)} />
          <MetricCard label="Average duration" value={`${formatNumber(Math.round(average))} ms`} />
          <MetricCard label="Slowest duration" value={slowest ? `${formatNumber(slowest.durationMs)} ms` : 'No data yet'} tone={slowest && slowest.durationMs > 2000 ? 'warning' : 'default'} />
          <MetricCard label="Latest log" value={measurements[0] ? formatDate(measurements[0].createdAt) : 'No data yet'} />
        </div>

        {measurements.length ? (
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <SortableDataTable columns={columns} rows={measurements as PerfRow[]} initialSortKey="durationMs" initialSortDirection="desc" enableSearch={false} />
          </Card>
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
              No timings recorded in this server process yet. Visit /meta, /business-overview, /sales-funnel, /customers, or /ratings, then reload this page.
            </p>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <Card>
            <SectionTitle>Likely Bottlenecks</SectionTitle>
            {[
              'Customer intelligence powers /sales-funnel and /customers and can be expensive because it builds lifecycle rows.',
              '/business-overview combines several helpers in parallel, including customer intelligence, Meta ads, site behavior, and period trends.',
              '/meta depends on aggregate Meta Ads tables and daily breakdowns, so it can be slower than static KPI pages.',
            ].map((item) => (
              <p key={item} style={{ margin: '0 0 8px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{item}</p>
            ))}
          </Card>
          <Card>
            <SectionTitle>Recommendations</SectionTitle>
            {[
              'Keep route prefetch disabled in the sidebar for heavy protected pages.',
              'Add short server-side cache wrappers for read-only aggregate helpers once freshness expectations are defined.',
              'If a helper is consistently slow, move repeated aggregate logic into curated read-only SQL views later.',
            ].map((item) => (
              <p key={item} style={{ margin: '0 0 8px', color: '#2D6A4F', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{item}</p>
            ))}
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

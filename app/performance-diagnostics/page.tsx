import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { formatDate, formatNumber } from '@/lib/format';
import { getPerformanceSummaries, getRecentPerformanceMeasurements, type PerformanceMeasurement, type PerformanceSummary } from '@/lib/performance';

export const runtime = 'nodejs';

type PerfRow = PerformanceMeasurement & Record<string, unknown>;
type PerfSummaryRow = PerformanceSummary & Record<string, unknown> & { likelyCause: string; recommendation: string };

const columns: SortableColumn<PerfRow>[] = [
  { key: 'createdAt', label: 'Logged at', type: 'date', width: 140 },
  { key: 'label', label: 'Helper / page', type: 'text', width: 360 },
  { key: 'durationMs', label: 'Duration ms', type: 'number' },
  { key: 'rowCount', label: 'Rows', type: 'number' },
  { key: 'cacheStatus', label: 'Cache', type: 'text' },
];

const summaryColumns: SortableColumn<PerfSummaryRow>[] = [
  { key: 'label', label: 'Helper / page', type: 'text', width: 340 },
  { key: 'callCount', label: 'Calls', type: 'number' },
  { key: 'averageDurationMs', label: 'Avg ms', type: 'number' },
  { key: 'lastDurationMs', label: 'Last ms', type: 'number' },
  { key: 'maxDurationMs', label: 'Max ms', type: 'number' },
  { key: 'lastRowCount', label: 'Rows', type: 'number' },
  { key: 'cacheStatus', label: 'Cache', type: 'text' },
  { key: 'likelyCause', label: 'Likely cause', type: 'text', width: 300 },
  { key: 'recommendation', label: 'Recommended fix', type: 'text', width: 340 },
];

function likelyCauseAndFix(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('metaadsperformance')) {
    return {
      cause: 'Full Meta drilldown (campaign/adset/ad plus JSON aggregation) is expensive.',
      fix: 'Keep full helper only on /meta and use lightweight overview helper elsewhere.',
    };
  }
  if (lower.includes('customerintelligence') || lower.includes('ratingsintelligence')) {
    return {
      cause: 'Customer/rating lifecycle joins produce large row sets.',
      fix: 'Split summary first, then defer heavy tables and row details.',
    };
  }
  if (lower.includes('sitebehavior') || lower.includes('ga4') || lower.includes('acquisition')) {
    return {
      cause: 'GA4 aggregation scans date ranges and multiple report tables.',
      fix: 'Keep narrow date windows and cache aggregate-only queries.',
    };
  }
  if (lower.includes('businessoverview')) {
    return {
      cause: 'Multiple helper calls compose this route, amplifying slow dependencies.',
      fix: 'Keep only summary helpers on this page and move deep analytics to detail pages.',
    };
  }
  return {
    cause: 'Likely aggregate query scan or heavy JSON parsing.',
    fix: 'Review query plan and reduce payload size for first render.',
  };
}

export default async function PerformanceDiagnosticsPage() {
  await connection();
  const measurements = getRecentPerformanceMeasurements();
  const summaries = getPerformanceSummaries();
  const slowest = [...measurements].sort((a, b) => b.durationMs - a.durationMs)[0] ?? null;
  const average = measurements.length ? measurements.reduce((sum, row) => sum + row.durationMs, 0) / measurements.length : 0;
  const helperSummaries = summaries.map((summary) => {
    const detail = likelyCauseAndFix(summary.label);
    return {
      ...summary,
      likelyCause: detail.cause,
      recommendation: detail.fix,
    };
  });

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
          <MetricCard label="Unique helpers/routes" value={formatNumber(summaries.length)} />
          <MetricCard label="Average duration" value={`${formatNumber(Math.round(average))} ms`} />
          <MetricCard label="Slowest duration" value={slowest ? `${formatNumber(slowest.durationMs)} ms` : 'No data yet'} tone={slowest && slowest.durationMs > 2000 ? 'warning' : 'default'} />
          <MetricCard label="Latest log" value={measurements[0] ? formatDate(measurements[0].createdAt) : 'No data yet'} />
        </div>

        {helperSummaries.length ? (
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <SortableDataTable columns={summaryColumns} rows={helperSummaries as PerfSummaryRow[]} initialSortKey="averageDurationMs" initialSortDirection="desc" enableSearch={false} />
          </Card>
        ) : null}

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
              'Customer intelligence and ratings intelligence can dominate latency when lifecycle tables are large.',
              'Full Meta helper is intentionally heavy; keep it on /meta only.',
              'GA4 aggregate scans are usually moderate, but become slow when broad ranges or many dimensions are fetched.',
            ].map((item) => (
              <p key={item} style={{ margin: '0 0 8px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{item}</p>
            ))}
          </Card>
          <Card>
            <SectionTitle>Recommendations</SectionTitle>
            {[
              'Keep route prefetch disabled in the sidebar for heavy protected pages.',
              'Use aggregate-only helpers for overview pages and reserve drilldowns for detail pages.',
              'JSONB line_items expansion may need a materialized table later for faster customer lifecycle joins.',
              'Shopify attribution joins (UTM/session/order) will likely need precomputed pipelines for true CAC/ROAS.',
              'GA4 and Meta aggregate tables are generally suitable as-is; focus optimization on join-heavy customer helpers first.',
            ].map((item) => (
              <p key={item} style={{ margin: '0 0 8px', color: '#2D6A4F', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{item}</p>
            ))}
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

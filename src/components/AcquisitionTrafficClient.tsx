'use client';

import { BarChart } from '@/components/BarChart';
import { DonutChart } from '@/components/DonutChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { LineChart } from '@/components/dashboard/LineChart';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { formatNumber, formatPercent } from '@/lib/format';
import type { AcquisitionTrafficDimensionRow, AcquisitionTrafficMetrics } from '@/lib/db';

type TrafficRow = Record<string, unknown> & AcquisitionTrafficDimensionRow & {
  change: number | null;
};

const columns: SortableColumn<TrafficRow>[] = [
  { key: 'name', label: 'Source / segment', type: 'text', width: 220 },
  { key: 'sessions', label: 'Sessions', type: 'number' },
  { key: 'users', label: 'Users', type: 'number' },
  { key: 'conversions', label: 'Conversions', type: 'number' },
  { key: 'conversionRate', label: 'Conversion rate', type: 'percent' },
  { key: 'change', label: 'Session trend', type: 'percent' },
];

function toRows(rows: AcquisitionTrafficDimensionRow[]): TrafficRow[] {
  return rows.map((row) => ({ ...row, change: row.trend.changePercent }));
}

export function AcquisitionTrafficClient({ metrics }: { metrics: AcquisitionTrafficMetrics }) {
  const sessionsSeries = metrics.series.map((point) => ({ label: point.date, value: point.sessions }));
  const usersSeries = metrics.series.map((point) => ({ label: point.date, value: point.users }));
  const conversionsSeries = metrics.series.map((point) => ({ label: point.date, value: point.conversions }));

  return (
    <>
      {!metrics.dataAvailable ? (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#B45309', fontSize: 13, fontWeight: 800 }}>
            GA4 tables are connected but currently empty.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            Tables present: {metrics.tablesPresent.join(', ')}. Tables with rows: {metrics.tablesWithRows.join(', ') || 'none'}.
          </p>
        </Card>
      ) : null}

      <PageSection>
        <SectionTitle sub="Sessions, users, and conversions by day">Traffic Trend</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card>
            <SectionTitle>Sessions</SectionTitle>
            <LineChart data={sessionsSeries} color="#722F37" />
          </Card>
          <Card>
            <SectionTitle>Users</SectionTitle>
            <LineChart data={usersSeries} color="#2D6A4F" />
          </Card>
          <Card>
            <SectionTitle>Conversions</SectionTitle>
            <LineChart data={conversionsSeries} color="#B45309" />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Where useful traffic should come from">Traffic Breakdown</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <Card>
            <SectionTitle>Top Source / Medium</SectionTitle>
            <BarChart data={metrics.sources.slice(0, 8).map((row) => ({ label: row.name, value: row.sessions, color: '#722F37' }))} />
          </Card>
          <Card>
            <SectionTitle>Default Channels</SectionTitle>
            <BarChart data={metrics.channels.slice(0, 8).map((row) => ({ label: row.name, value: row.sessions, color: '#2D6A4F' }))} />
          </Card>
          <Card>
            <SectionTitle>Devices</SectionTitle>
            <DonutChart data={metrics.devices.map((row) => ({ label: row.name, value: row.sessions, color: row.name.toLowerCase().includes('mobile') ? '#722F37' : '#2D6A4F' }))} />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Sortable traffic quality diagnostics">Source / Medium Quality</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SortableDataTable columns={columns} rows={toRows(metrics.sources)} initialSortKey="sessions" searchPlaceholder="Search source, medium..." />
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Campaign naming from GA4">Campaign Quality</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SortableDataTable columns={columns} rows={toRows(metrics.campaigns)} initialSortKey="sessions" searchPlaceholder="Search campaign..." />
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Interpretation">What Needs Attention?</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {metrics.insights.map((insight) => (
            <Card key={insight}>
              <p style={{ margin: 0, color: insight.includes('empty') || insight.includes('Check') ? '#B45309' : '#2D6A4F', fontSize: 13, fontWeight: 700 }}>
                {insight}
              </p>
            </Card>
          ))}
          <Card>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
              Conversion rate: {formatPercent(metrics.conversionRate.current)} from {formatNumber(metrics.sessions.current)} sessions.
            </p>
          </Card>
        </div>
      </PageSection>
    </>
  );
}

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
  const engagedSeries = metrics.series.map((point) => ({ label: point.date, value: point.engagedSessions }));
  const eventsSeries = metrics.series.map((point) => ({ label: point.date, value: point.eventCount }));
  const pageViewsSeries = metrics.series.map((point) => ({ label: point.date, value: point.pageViews }));
  const conversionsSeries = metrics.series.map((point) => ({ label: point.date, value: point.conversions }));
  const locationRows = [...metrics.cities.slice(0, 8), ...metrics.regions.slice(0, 6), ...metrics.countries.slice(0, 6)].slice(0, 20);

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
        <SectionTitle sub="Daily GA4 direction">Traffic Trend</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card>
            <SectionTitle>Sessions</SectionTitle>
            <LineChart data={sessionsSeries} color="#722F37" />
          </Card>
          <Card>
            <SectionTitle>Users + Engaged Sessions</SectionTitle>
            <LineChart data={usersSeries} color="#2D6A4F" />
          </Card>
          <Card>
            <SectionTitle>Engaged Sessions</SectionTitle>
            <LineChart data={engagedSeries} color="#2D6A4F" />
          </Card>
          <Card>
            <SectionTitle>Events</SectionTitle>
            <LineChart data={eventsSeries} color="#A67C00" />
          </Card>
          <Card>
            <SectionTitle>Page Views</SectionTitle>
            <LineChart data={pageViewsSeries} color="#6B6B6B" />
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
        <SectionTitle sub="Compact sortable tables">Traffic Details</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Source / Medium</SectionTitle>
            </div>
            <SortableDataTable columns={columns} rows={toRows(metrics.sources).slice(0, 20)} initialSortKey="sessions" searchPlaceholder="Search source, medium..." maxHeight={420} />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Campaigns</SectionTitle>
            </div>
            <SortableDataTable columns={columns} rows={toRows(metrics.campaigns).slice(0, 20)} initialSortKey="sessions" searchPlaceholder="Search campaign..." maxHeight={420} />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Device / Geo</SectionTitle>
            </div>
            <SortableDataTable columns={columns} rows={toRows([...metrics.devices, ...locationRows]).slice(0, 24)} initialSortKey="sessions" searchPlaceholder="Search device or place..." maxHeight={420} />
          </Card>
        </div>
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

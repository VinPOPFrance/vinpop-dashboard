import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getTrackingReadiness } from '@/lib/db';
import { formatNumber } from '@/lib/format';

export const runtime = 'nodejs';

type TrackingTableRow = Record<string, unknown> & {
  table: string;
  rows: number | null;
  firstDate: string | null;
  latestDate: string | null;
  matchedColumns: string;
};

const columns: SortableColumn<TrackingTableRow>[] = [
  { key: 'table', label: 'Table', type: 'text', width: 260 },
  { key: 'rows', label: 'Rows', type: 'number' },
  { key: 'firstDate', label: 'First date', type: 'date' },
  { key: 'latestDate', label: 'Latest date', type: 'date' },
  { key: 'matchedColumns', label: 'Matched columns', type: 'text', width: 360 },
];

function statusColor(status: string) {
  if (status === 'good') return '#2D6A4F';
  if (status === 'warning') return '#B45309';
  if (status === 'critical') return '#C0392B';
  return '#6B6B6B';
}

export default async function TrackingReadinessPage() {
  await connection();
  const result = await getTrackingReadiness();
  const metrics = result.ok ? result.metrics : null;
  const rows: TrackingTableRow[] = metrics
    ? metrics.availableTables.map((table) => ({
        table: `${table.schemaName}.${table.tableName}`,
        rows: table.rowCount,
        firstDate: table.firstDate,
        latestDate: table.latestDate,
        matchedColumns: table.matchedColumns.join(', '),
      }))
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Tracking Readiness" subtitle="What tracking exists, what is missing, and what data is needed next" />
      <PageSection>
        <SectionTitle sub="Diagnostic only. Metadata and safe aggregate counts only.">Tracking Status</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            No table rows, customer payloads, phone numbers, or addresses are displayed.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <MetricCard label="GA4 connected" value={metrics.ga4Connected ? 'Yes' : 'No rows'} tone={metrics.ga4Connected ? 'good' : 'warning'} />
              <MetricCard label="GA4 tables with rows" value={formatNumber(metrics.ga4TablesWithRows.length)} />
              <MetricCard label="Matched tables" value={formatNumber(metrics.availableTables.length)} />
              <MetricCard label="Missing core tables" value={formatNumber(metrics.missingTables.length)} tone={metrics.missingTables.length ? 'warning' : 'good'} />
            </div>

            <PageSection>
              <SectionTitle sub="Can we answer the tracking questions today?">Capabilities</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {metrics.capabilities.map((capability) => (
                  <Card key={capability.label}>
                    <div style={{ color: statusColor(capability.status), fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{capability.status}</div>
                    <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{capability.label}</div>
                    <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.5, margin: '8px 0 0' }}>{capability.evidence}</p>
                    {capability.dataNeeded?.length ? (
                      <p style={{ color: '#9B9B9B', fontSize: 11, lineHeight: 1.5, margin: '8px 0 0' }}>
                        Needed: {capability.dataNeeded.slice(0, 8).join(', ')}{capability.dataNeeded.length > 8 ? '...' : ''}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Tables discovered through information_schema">Available Tables</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <SortableDataTable columns={columns} rows={rows} initialSortKey="rows" searchPlaceholder="Search tables or columns..." />
              </Card>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Exact fields needed to unlock visitor, session, and event analytics">Data Needed</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {[
                  ['Visitors', metrics.requiredVisitorFields],
                  ['Sessions', metrics.requiredSessionFields],
                  ['Events', metrics.requiredEventFields],
                ].map(([title, fields]) => (
                  <Card key={title as string}>
                    <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>{title as string}</div>
                    <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.6, margin: '8px 0 0' }}>{(fields as string[]).join(', ')}</p>
                  </Card>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Prepare quiz_started and quiz_completed without touching the Shopify theme yet">Quiz Tracking Plan</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <Card>
                  <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>1. GA4 event</div>
                  <p style={{ color: '#6B6B6B', fontSize: 13, lineHeight: 1.5, margin: '8px 0 0' }}>
                    Send quiz_started on the first quiz click/answer and quiz_completed when the last question or email step is submitted. GA4 is useful for traffic and behavior reports.
                  </p>
                </Card>
                <Card>
                  <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>2. Meta Pixel / custom event</div>
                  <p style={{ color: '#6B6B6B', fontSize: 13, lineHeight: 1.5, margin: '8px 0 0' }}>
                    Send the same events to Meta for optimization and audience building. Keep event names consistent across GA4, Meta, and backend tracking.
                  </p>
                </Card>
                <Card>
                  <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>3. PostgreSQL backend event</div>
                  <p style={{ color: '#6B6B6B', fontSize: 13, lineHeight: 1.5, margin: '8px 0 0' }}>
                    Store visitor_id, session_id, event_name, event_time, page_url, UTM fields, and customer_id when known. This is required for reliable dashboard attribution.
                  </p>
                </Card>
              </div>
              <Card style={{ marginTop: 12 }}>
                <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
                  Recommended events: quiz_started, quiz_completed, email_submitted, taste_kit_viewed, taste_kit_added_to_cart, checkout_started, purchase_completed, wine_rated_love, wine_rated_like, wine_rated_dislike, smart_box_viewed, smart_box_purchased.
                </p>
              </Card>
            </PageSection>
          </>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Tracking readiness could not be loaded safely.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

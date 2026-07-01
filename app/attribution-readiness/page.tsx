import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getMetaAdsPerformance, getTrackingReadiness } from '@/lib/db';

export const runtime = 'nodejs';

const requiredFields = [
  'visitor_id',
  'session_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'fbc',
  'fbp',
  'meta_click_id',
  'first_landing_page',
  'first_seen_at',
  'last_seen_at',
  'customer_id when known',
  'checkout_started',
  'order_id after purchase',
];

function hasAnyColumn(columns: string[], names: string[]) {
  const lower = new Set(columns.map((column) => column.toLowerCase()));
  return names.some((name) => lower.has(name.toLowerCase()));
}

export default async function AttributionReadinessPage() {
  await connection();
  const [trackingResult, metaResult] = await Promise.all([getTrackingReadiness(), getMetaAdsPerformance()]);
  const tracking = trackingResult.ok ? trackingResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const allColumns = tracking?.availableTables.flatMap((table) => table.matchedColumns) ?? [];
  const checks = [
    ['utm_source available', hasAnyColumn(allColumns, ['utm_source'])],
    ['utm_campaign available', hasAnyColumn(allColumns, ['utm_campaign'])],
    ['utm_content available', hasAnyColumn(allColumns, ['utm_content'])],
    ['meta_click_id / fbclid / fbc / fbp available', hasAnyColumn(allColumns, ['meta_click_id', 'fbclid', 'fbc', 'fbp'])],
    ['session_id available', hasAnyColumn(allColumns, ['session_id'])],
    ['visitor_id available', hasAnyColumn(allColumns, ['visitor_id'])],
    ['order_id linked to session/customer', hasAnyColumn(allColumns, ['order_id']) && hasAnyColumn(allColumns, ['session_id', 'customer_id'])],
  ] as const;
  const campaignOrderAttribution = checks.every(([, available]) => available);
  const canCalculateCac = campaignOrderAttribution && Boolean(meta?.totalSpend);
  const canCalculateRoas = campaignOrderAttribution && Boolean(meta?.totalSpend);

  return (
    <DashboardLayout>
      <TopBar title="Attribution Readiness" subtitle="Can Meta campaigns be connected to Shopify sales yet?" />
      <PageSection>
        <SectionTitle sub="Diagnostic only. Metadata and aggregate ad totals only.">Meta-to-Sales Attribution</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            No customer rows, raw payloads, phone numbers, or addresses are displayed.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <MetricCard label="Campaign → order attribution" value={campaignOrderAttribution ? 'Possible' : 'Missing'} tone={campaignOrderAttribution ? 'good' : 'warning'} />
          <MetricCard label="CAC" value={canCalculateCac ? 'Possible' : 'Unavailable'} tone={canCalculateCac ? 'good' : 'warning'} />
          <MetricCard label="ROAS" value={canCalculateRoas ? 'Possible' : 'Unavailable'} tone={canCalculateRoas ? 'good' : 'warning'} />
          <MetricCard label="Meta action attribution" value={meta?.attributionAvailable ? 'Available' : 'Unavailable'} tone={meta?.attributionAvailable ? 'good' : 'warning'} />
        </div>

        <PageSection>
          <SectionTitle sub="Required identifiers and joins">Readiness Checks</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {checks.map(([label, available]) => (
              <Card key={label}>
                <div style={{ color: available ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 800 }}>
                  {available ? 'Available' : 'Missing'}
                </div>
                <p style={{ margin: '6px 0 0', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>{label}</p>
              </Card>
            ))}
          </div>
        </PageSection>

        <PageSection>
          <SectionTitle sub="Implement this before scaling ads based on CAC/ROAS">Exact Implementation Plan</SectionTitle>
          <Card>
            <p style={{ margin: '0 0 8px', color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              True CAC/ROAS needs UTM + Meta click identity + session tracking + order linkage.
            </p>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.6 }}>
              Track and store: {requiredFields.join(', ')}.
            </p>
          </Card>
        </PageSection>
      </PageSection>
    </DashboardLayout>
  );
}

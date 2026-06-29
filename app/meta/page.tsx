import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getMetaAdsPerformance, type MetaPerformanceRow } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function ctrLabel(value: number | null): string {
  if (value === null) return 'CTR is unavailable.';
  if (value >= 2) return 'CTR is good: Meta is generating traffic.';
  if (value >= 1) return 'CTR is average: traffic is present, but creative can improve.';
  return 'CTR is weak: review creative, offer, or audience.';
}

function cpcLabel(value: number | null): string {
  if (value === null) return 'CPC is unavailable.';
  if (value <= 0.5) return 'CPC is good.';
  if (value <= 1.5) return 'CPC is acceptable.';
  return 'CPC is high: test new creatives or targeting.';
}

function PerformanceTable({ title, rows, parentLabel }: { title: string; rows: MetaPerformanceRow[]; parentLabel: string }) {
  return (
    <PageSection>
      <SectionTitle>{title}</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                {['Name', parentLabel, 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Purchases', 'CPA', 'ROAS', 'Label', 'Recommended action'].map((heading) => (
                  <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.name}.${row.parentName}`} style={{ borderTop: '1px solid #E8E6E1' }}>
                  <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{row.parentName || '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>{formatMoney(row.spend)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(row.impressions)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(row.clicks)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(row.ctr)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(row.cpc)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(row.cpm)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(row.purchases)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(row.cpa)}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(row.roas)}</td>
                  <td style={{ padding: '10px 14px', color: row.performanceLabel === 'Weak' ? '#B45309' : '#2D6A4F', fontWeight: 600 }}>{row.performanceLabel}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{row.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageSection>
  );
}

export default async function MetaPage() {
  await connection();
  const result = await getMetaAdsPerformance();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        ['Total spend', formatMoney(metrics.totalSpend)],
        ['Impressions', formatNumber(metrics.impressions)],
        ['Clicks', formatNumber(metrics.clicks)],
        ['CTR', formatPercent(metrics.ctr)],
        ['CPC', formatMoney(metrics.cpc)],
        ['CPM', formatMoney(metrics.cpm)],
        ['Campaigns', formatNumber(metrics.campaignsCount)],
        ['Ad sets', formatNumber(metrics.adSetsCount)],
        ['Ads', formatNumber(metrics.adsCount)],
        ['Purchases', formatNumber(metrics.purchases)],
        ['CPA', formatMoney(metrics.cpa)],
        ['ROAS', formatNumber(metrics.roas)],
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Meta Ads" subtitle="Real Meta platform metrics and attribution readiness" />
      <PageSection>
        <SectionTitle sub="Platform metrics only where attribution is unavailable">Meta Ads Performance</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate ad metrics only. No customer data is displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            {metrics?.attributionNote ?? 'Meta Ads performance could not be loaded.'}
          </p>
        </Card>
        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {cards.map(([label, value]) => (
                <Card key={label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{label}</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{value}</div>
                </Card>
              ))}
            </div>
            <PageSection>
              <SectionTitle sub="Plain business read">Simple Interpretation</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[ctrLabel(metrics.ctr), cpcLabel(metrics.cpc), 'CAC is unavailable because Meta-to-Shopify attribution is missing.', 'ROAS is unavailable because revenue attribution is missing.'].map((item) => (
                  <Card key={item}>
                    <p style={{ margin: 0, color: item.includes('unavailable') || item.includes('high') || item.includes('weak') ? '#B45309' : '#2D6A4F', fontSize: 13, fontWeight: 600 }}>
                      {item}
                    </p>
                  </Card>
                ))}
              </div>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Tracking needed before scaling">Attribution Gap</SectionTitle>
              <Card>
                <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
                  CAC and ROAS are not reliable yet.
                </p>
                <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
                  Need Meta click/campaign/ad identifiers connected to Shopify orders, UTMs or meta_click_id stored from first visit through checkout, and customer/session/event tracking. Then the dashboard can calculate cost per visitor, quiz, Taste Kit purchase, CAC, ROAS, and campaign-level revenue.
                </p>
              </Card>
            </PageSection>
            <PageSection>
              <SectionTitle sub="What to do next">Meta Action Plan</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Implement UTM/meta click tracking before increasing spend.',
                  metrics.ctr !== null && metrics.ctr >= 2 ? 'Landing page/funnel tracking is missing; do not judge ads only by clicks.' : null,
                  metrics.cpc !== null && metrics.cpc > 1.5 ? 'Test new creatives or targeting.' : null,
                ].filter(Boolean).map((item) => (
                  <Card key={item}>
                    <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>{item}</p>
                  </Card>
                ))}
              </div>
            </PageSection>
            <PerformanceTable title="Campaign Performance" rows={metrics.campaigns} parentLabel="Parent" />
            <PerformanceTable title="Ad Set Performance" rows={metrics.adSets} parentLabel="Campaign" />
            <PerformanceTable title="Ad Performance" rows={metrics.ads} parentLabel="Ad set" />
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

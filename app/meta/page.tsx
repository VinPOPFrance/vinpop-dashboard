import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetaAdsDashboardClient } from '@/components/MetaAdsDashboardClient';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getMetaAdsPerformance } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

export default async function MetaPage() {
  await connection();
  const result = await getMetaAdsPerformance();
  const metrics = result.ok ? result.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Meta Ads" subtitle="Aggregate Meta performance with sortable campaign/ad tables" />
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
              {[
                ['Total spend', formatEuro(metrics.totalSpend)],
                ['Impressions', formatNumber(metrics.impressions)],
                ['Clicks', formatNumber(metrics.clicks)],
                ['CTR', formatPercent(metrics.ctr)],
                ['CPC', formatEuro(metrics.cpc)],
                ['CPM', formatEuro(metrics.cpm)],
                ['Campaigns', formatNumber(metrics.campaignsCount)],
                ['Ad sets', formatNumber(metrics.adSetsCount)],
                ['Ads', formatNumber(metrics.adsCount)],
                ['Purchases', formatNumber(metrics.purchases)],
                ['CPA', formatEuro(metrics.cpa)],
                ['ROAS', formatNumber(metrics.roas, 2)],
              ].map(([label, value]) => (
                <MetricCard key={label} label={label} value={value} />
              ))}
            </div>
            <MetaAdsDashboardClient metrics={metrics} />
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

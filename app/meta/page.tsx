import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetaAdsDashboardClient } from '@/components/MetaAdsDashboardClient';
import { TopBar } from '@/components/TopBar';
import { getMetaAdsPerformance } from '@/lib/db';

export const runtime = 'nodejs';

export default async function MetaPage() {
  await connection();
  const result = await getMetaAdsPerformance();
  const metrics = result.ok ? result.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Meta Creative Performance" subtitle="Decide which creatives to scale, watch, pause, or fix" />
      <PageSection>
        <SectionTitle sub="Power-BI style drilldown from campaign to ad">Creative Performance</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate ad metrics only. No customer data is displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            {metrics?.attributionNote ?? 'Meta Ads performance could not be loaded.'}
          </p>
        </Card>

        {metrics ? (
          <MetaAdsDashboardClient metrics={metrics} />
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

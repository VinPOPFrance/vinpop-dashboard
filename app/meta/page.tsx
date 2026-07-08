import { Suspense } from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetaAdsDashboardClient } from '@/components/MetaAdsDashboardClient';
import { MetaLandingTimingClient } from '@/components/MetaLandingTimingClient';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedMetaAdsPerformance } from '@/lib/cachedDb';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function MetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

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
            Meta platform attribution is displayed when purchase/action values are available. True Shopify CAC/ROAS attribution still requires session/order joining.
          </p>
        </Card>

        <MetaLandingTimingClient period={range.period} label={range.label} />

        <Suspense
          fallback={(
            <Card>
              <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 600 }}>
                Loading Meta campaign/adset/ad drilldowns...
              </p>
            </Card>
          )}
        >
          <MetaContent />
        </Suspense>
      </PageSection>
    </DashboardLayout>
  );
}

async function MetaContent() {
  let metrics = null;

  try {
    const result = await timeAsync('page:/meta getMetaAdsPerformance', () => getCachedMetaAdsPerformance(), {
      category: 'page',
      rowCount: (helperResult) => (helperResult.ok ? helperResult.metrics.ads.length : null),
    });
    metrics = result.ok ? result.metrics : null;
  } catch {
    metrics = null;
  }

  if (!metrics) {
    return (
      <Card>
        <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
          Could not load Meta Ads performance. Check the server database connection.
        </p>
      </Card>
    );
  }

  return <MetaAdsDashboardClient metrics={metrics} />;
}

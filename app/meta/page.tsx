import { Suspense } from 'react';
import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { MetaAdsDashboardClient } from '@/components/MetaAdsDashboardClient';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedMetaAdsPerformance } from '@/lib/cachedDb';
import { getLandingPageArrivals } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function MetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const landingResult = await timeAsync('page:/meta getLandingPageArrivals', () => getLandingPageArrivals(range), {
    category: 'page',
  });
  const landing = landingResult.ok ? landingResult.metrics : null;
  const hourlyBuckets = landing?.byHour.length
    ? landing.byHour
    : Array.from({ length: 24 }, (_, hour) => ({ hour, arrivals: 0, uniqueSessions: 0 }));

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

        <PageSection>
          <SectionTitle sub={`Landing page arrivals from PostgreSQL site_events · ${range.label}`}>Landing Page Timing</SectionTitle>
          <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              This shows the best day and best hour for landing page arrivals, so you can decide whether to run ads all day or only in strong windows.
            </p>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <MetricCard label="Best day" value={landing?.topDay ? `${landing.topDay.date} (${formatNumber(landing.topDay.arrivals)})` : 'No data'} />
            <MetricCard label="Best hour" value={landing?.topHour ? `${landing.topHour.hour.toString().padStart(2, '0')}:00 (${formatNumber(landing.topHour.arrivals)})` : 'No data'} />
            <MetricCard label="Total arrivals" value={landing ? formatNumber(landing.totalArrivals) : 'No data'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Card>
              <SectionTitle>Arrivals by day</SectionTitle>
              {landing?.daily.length ? (
                <BarChart
                  data={landing.daily.map((row) => ({ label: row.date, value: row.arrivals, color: '#2D6A4F' }))}
                  valueFormatter={(value) => formatNumber(value)}
                />
              ) : (
                <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No landing page timing data yet.</p>
              )}
            </Card>
            <Card>
              <SectionTitle>Arrivals by hour</SectionTitle>
              <BarChart
                data={hourlyBuckets.map((row) => ({
                  label: `${row.hour.toString().padStart(2, '0')}:00`,
                  value: row.arrivals,
                  color: '#722F37',
                }))}
                valueFormatter={(value) => formatNumber(value)}
              />
            </Card>
          </div>
        </PageSection>

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
  const result = await timeAsync('page:/meta getMetaAdsPerformance', () => getCachedMetaAdsPerformance(), {
    category: 'page',
    rowCount: (helperResult) => (helperResult.ok ? helperResult.metrics.ads.length : null),
  });
  const metrics = result.ok ? result.metrics : null;

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

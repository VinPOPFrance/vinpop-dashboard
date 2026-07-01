import { connection } from 'next/server';
import { AcquisitionTrafficClient } from '@/components/AcquisitionTrafficClient';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { LineChart } from '@/components/dashboard/LineChart';
import { TrendBadge } from '@/components/dashboard/TrendBadge';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getAcquisitionTraffic, getSiteBehavior } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

export default async function AcquisitionTrafficPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const [result, siteResult] = await Promise.all([getAcquisitionTraffic(range), getSiteBehavior(range)]);
  const metrics = result.ok ? result.metrics : null;
  const siteMetrics = siteResult.ok ? siteResult.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Acquisition & Traffic" subtitle="GA4 traffic quality, sources, campaigns, and conversion direction" />
      <PageSection>
        <SectionTitle sub={`Selected period: ${range.label}`}>Is Acquisition Progressing?</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 800 }}>
            GA4 integration is directional and depends on Airbyte report sync freshness.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            No customer personal data is displayed on this page.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              <MetricCard label="Sessions" value={formatNumber(metrics.sessions.current)} hint={<TrendBadge trend={metrics.sessions} />} />
              <MetricCard label="Users" value={formatNumber(metrics.users.current)} hint={<TrendBadge trend={metrics.users} />} />
              <MetricCard label="Conversions" value={formatNumber(metrics.conversions.current)} hint={<TrendBadge trend={metrics.conversions} />} />
              <MetricCard label="Conversion rate" value={formatPercent(metrics.conversionRate.current)} hint={<TrendBadge trend={metrics.conversionRate} />} />
              <MetricCard label="GA4 revenue" value={formatEuro(metrics.revenue.current)} hint={<TrendBadge trend={metrics.revenue} />} />
            </div>
            <AcquisitionTrafficClient metrics={metrics} />
            {!metrics.dataAvailable && siteMetrics ? (
              <PageSection>
                <SectionTitle sub="Fallback aggregate signals while GA4 reporting tables are empty">Shopify / Site Fallback</SectionTitle>
                <Card style={{ marginBottom: 16, borderColor: '#F2C94C', background: '#FFFCF0' }}>
                  <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 800 }}>
                    GA4 connector exists but usable GA4 traffic tables are not yet available in PostgreSQL. Showing Shopify/site signals instead.
                  </p>
                </Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <Card>
                    <SectionTitle>Orders by Day</SectionTitle>
                    <LineChart data={siteMetrics.series.map((row) => ({ label: row.date, value: row.orders }))} color="#722F37" />
                  </Card>
                  <Card>
                    <SectionTitle>Abandoned Checkouts by Day</SectionTitle>
                    <LineChart data={siteMetrics.series.map((row) => ({ label: row.date, value: row.abandonedCheckouts }))} color="#B45309" />
                  </Card>
                  <Card>
                    <SectionTitle>Ratings by Day</SectionTitle>
                    <LineChart data={siteMetrics.series.map((row) => ({ label: row.date, value: row.ratings }))} color="#A67C00" />
                  </Card>
                  <Card>
                    <SectionTitle>Quizzes by Day</SectionTitle>
                    <LineChart data={siteMetrics.series.map((row) => ({ label: row.date, value: row.quizzes }))} color="#2D6A4F" />
                  </Card>
                </div>
              </PageSection>
            ) : null}
          </>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Could not load GA4 acquisition metrics. Check DATABASE_URL and GA4 Airbyte tables.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

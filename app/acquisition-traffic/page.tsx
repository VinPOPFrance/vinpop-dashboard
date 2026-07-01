import { connection } from 'next/server';
import { AcquisitionTrafficClient } from '@/components/AcquisitionTrafficClient';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TrendBadge } from '@/components/dashboard/TrendBadge';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedAcquisitionTraffic, rangeCacheArgs } from '@/lib/cachedDb';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function AcquisitionTrafficPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const rangeArgs = rangeCacheArgs(range);
  const result = await timeAsync('page:/acquisition-traffic getAcquisitionTraffic', () => getCachedAcquisitionTraffic(...rangeArgs));
  const metrics = result.ok ? result.metrics : null;

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
              <MetricCard label="Total users" value={formatNumber(metrics.users.current)} hint={<TrendBadge trend={metrics.users} />} />
              <MetricCard label="Engaged sessions" value={formatNumber(metrics.engagedSessions.current)} hint={<TrendBadge trend={metrics.engagedSessions} />} />
              <MetricCard label="Engagement rate" value={formatPercent(metrics.engagementRate.current)} hint={<TrendBadge trend={metrics.engagementRate} />} />
              <MetricCard label="Events / session" value={formatNumber(metrics.eventsPerSession.current, 2)} hint={<TrendBadge trend={metrics.eventsPerSession} />} />
              <MetricCard label="Page views" value={formatNumber(metrics.pageViews.current)} hint={<TrendBadge trend={metrics.pageViews} />} />
              <MetricCard label="Avg engagement sec." value={formatNumber(metrics.averageEngagementDuration.current)} hint={<TrendBadge trend={metrics.averageEngagementDuration} />} />
              <MetricCard label="Conversions" value={formatNumber(metrics.conversions.current)} hint={<TrendBadge trend={metrics.conversions} />} />
              <MetricCard label="Conversion rate" value={formatPercent(metrics.conversionRate.current)} hint={<TrendBadge trend={metrics.conversionRate} />} />
              <MetricCard label="GA4 revenue" value={formatEuro(metrics.revenue.current)} hint={<TrendBadge trend={metrics.revenue} />} />
            </div>
            <AcquisitionTrafficClient metrics={metrics} />
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

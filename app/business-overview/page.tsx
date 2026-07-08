import { connection } from 'next/server';
import { BusinessOverviewDailyClient } from '@/components/BusinessOverviewDailyClient';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TrendBadge } from '@/components/dashboard/TrendBadge';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedGa4OverviewTrends, getCachedMetaAdsOverviewSummary, getCachedSiteBehavior, rangeCacheArgs } from '@/lib/cachedDb';
import type { Trend } from '@/lib/analytics/trends';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';
import { getBusinessOverview } from '@/lib/db';

export const runtime = 'nodejs';

function statusTone(status: string): 'default' | 'good' | 'warning' {
  return status === 'Good' ? 'good' : status === 'Critical' || status === 'Missing data' ? 'warning' : 'default';
}

function trendTone(trend: Trend | null): 'default' | 'good' | 'warning' {
  if (!trend) return 'default';
  if (trend.status === 'good') return 'good';
  if (trend.status === 'warning' || trend.status === 'critical') return 'warning';
  return 'default';
}

function trendSummary(label: string, trend: Trend | null) {
  if (!trend) return `${label} unavailable`;
  if (trend.changePercent === null) return `No ${label.toLowerCase()} baseline`;
  if (trend.direction === 'up') return `${label} up vs previous period`;
  if (trend.direction === 'down') return `${label} down vs previous period`;
  return `${label} flat vs previous period`;
}

function statusCard(label: string, status: string, value: string, interpretation: string) {
  return { label, status, value, interpretation };
}

export default async function BusinessOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const rangeArgs = rangeCacheArgs(range);
  const [businessResult, siteBehaviorResult, ga4Result, metaResult] = await Promise.all([
    timeAsync('page:/business-overview getBusinessOverview', () => getBusinessOverview(), {
      category: 'page',
    }),
    timeAsync('page:/business-overview getSiteBehavior', () => getCachedSiteBehavior(...rangeArgs), {
      category: 'page',
      rowCount: (result) => (result.ok ? result.metrics.series.length : null),
    }),
    timeAsync('page:/business-overview getGa4OverviewTrends', () => getCachedGa4OverviewTrends(...rangeArgs), {
      category: 'page',
      rowCount: (result) => (result.ok ? result.metrics.daily.length : null),
    }),
    timeAsync('page:/business-overview getMetaAdsOverviewSummary', () => getCachedMetaAdsOverviewSummary(...rangeArgs), {
      category: 'page',
      rowCount: (result) => (result.ok ? result.metrics.daily.length : null),
    }),
  ]);

  const business = businessResult.ok ? businessResult.metrics : null;
  const siteBehavior = siteBehaviorResult.ok ? siteBehaviorResult.metrics : null;
  const ga4 = ga4Result.ok ? ga4Result.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;

  const ratingsCount = siteBehavior?.totalRatings ?? 0;
  const cards = business
    ? [
        statusCard(
          'Traffic',
          ga4?.dataAvailable ? (ga4.sessions.direction === 'down' ? 'Critical' : ga4.sessions.direction === 'flat' ? 'Watch' : 'Good') : 'Missing data',
          ga4?.dataAvailable ? `${formatNumber(ga4.sessions.current)} sessions` : 'Missing data',
          ga4?.dataAvailable ? trendSummary('Traffic', ga4.sessions) : 'No GA4 data for this period.',
        ),
        statusCard(
          'Engagement',
          ga4?.dataAvailable ? (ga4.engagementRate.direction === 'down' ? 'Critical' : ga4.engagementRate.direction === 'flat' ? 'Watch' : 'Good') : 'Missing data',
          ga4?.dataAvailable ? formatPercent(ga4.engagementRate.current) : 'Missing data',
          ga4?.dataAvailable ? trendSummary('Engagement', ga4.engagementRate) : 'No GA4 data for this period.',
        ),
        statusCard(
          'Page Views',
          ga4?.dataAvailable ? (ga4.pageViews.direction === 'down' ? 'Critical' : ga4.pageViews.direction === 'flat' ? 'Watch' : 'Good') : 'Missing data',
          ga4?.dataAvailable ? formatNumber(ga4.pageViews.current) : 'Missing data',
          ga4?.dataAvailable ? trendSummary('Page views', ga4.pageViews) : 'No GA4 data for this period.',
        ),
        statusCard(
          'Sales',
          business.totalOrders > 0 ? 'Good' : 'Critical',
          `${formatNumber(business.totalOrders)} orders · ${formatEuro(business.totalRevenue)}`,
          `${formatNumber(business.abandonedCheckoutCount)} abandoned checkouts to watch.`,
        ),
        statusCard(
          'Ratings',
          ratingsCount > 0 ? 'Good' : 'Watch',
          `${formatNumber(ratingsCount)} ratings`,
          `${formatNumber(business.usersWithRatings)} customers rated · ${formatNumber(business.ratingsPerUser, 1)} ratings/customer.`,
        ),
        statusCard(
          'Repeat Orders',
          (business.reorderRate ?? 0) >= 20 ? 'Good' : 'Watch',
          `${formatNumber(business.repeatCustomers)} repeat customers`,
          `Reorder rate is ${formatPercent(business.reorderRate)}.`,
        ),
        statusCard(
          'Acquisition Source',
          ga4?.topSourceMedium ? 'Good' : 'Watch',
          ga4?.topSourceMedium || 'Unknown',
          ga4?.topSourceMedium ? 'Top source / medium in selected period.' : 'No source/medium detected for this period.',
        ),
        statusCard(
          'Meta Attribution',
          meta?.attributionAvailable ? 'Good' : 'Watch',
          meta?.attributionAvailable ? 'Available' : 'Missing data',
          meta?.attributionNote || 'Meta summary unavailable.',
        ),
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Business Overview" subtitle="The 10-second VinPop business check" />

      <PageSection>
        <SectionTitle sub={`Simple executive view · ${range.label}`}>Are we moving in the right direction?</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            Business metrics only. No individual orders, phone numbers, addresses, or raw payloads are displayed here.
          </p>
        </Card>

        {business ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
              {cards.map((card) => (
                <MetricCard
                  key={card.label}
                  label={`${card.label}: ${card.status}`}
                  value={card.value}
                  hint={card.interpretation}
                  tone={statusTone(card.status)}
                />
              ))}
            </div>

            {siteBehavior ? (
              <PageSection>
                <SectionTitle sub="Click a point to inspect that day">Daily Direction</SectionTitle>
                <BusinessOverviewDailyClient siteSeries={siteBehavior.series} hasGa4Rows={siteBehavior.hasGa4Rows} />
              </PageSection>
            ) : null}

            <PageSection>
              <SectionTitle sub="GA4 trend status for selected range">Traffic Trend Indicators</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                <MetricCard label="Sessions" value={ga4?.dataAvailable ? formatNumber(ga4.sessions.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.sessions} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.sessions ?? null)} />
                <MetricCard label="Total users" value={ga4?.dataAvailable ? formatNumber(ga4.users.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.users} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.users ?? null)} />
                <MetricCard label="Engaged sessions" value={ga4?.dataAvailable ? formatNumber(ga4.engagedSessions.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.engagedSessions} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.engagedSessions ?? null)} />
                <MetricCard label="Page views" value={ga4?.dataAvailable ? formatNumber(ga4.pageViews.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.pageViews} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.pageViews ?? null)} />
                <MetricCard label="Engagement rate" value={ga4?.dataAvailable ? formatPercent(ga4.engagementRate.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.engagementRate} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.engagementRate ?? null)} />
                <MetricCard label="Events / session" value={ga4?.dataAvailable ? formatNumber(ga4.eventsPerSession.current, 2) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.eventsPerSession} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.eventsPerSession ?? null)} />
                <MetricCard label="Conversions/events" value={ga4?.dataAvailable ? formatNumber(ga4.conversions.current) : 'Missing data'} hint={ga4?.dataAvailable ? <TrendBadge trend={ga4.conversions} /> : 'No GA4 data for this period'} tone={trendTone(ga4?.conversions ?? null)} />
                <MetricCard label="Top source / medium" value={ga4?.topSourceMedium || 'Missing data'} hint={ga4?.topSourceMedium ? 'Top acquisition source in selected period.' : 'No source-medium mapping in this period.'} />
                <MetricCard label="Meta spend" value={meta ? formatEuro(meta.totalSpend) : 'Missing data'} hint={meta?.daily.length ? `${formatNumber(meta.daily.length)} daily points` : 'No Meta rows for this period'} />
                <MetricCard label="Meta clicks" value={meta ? formatNumber(meta.clicks) : 'Missing data'} hint={meta ? `CTR ${formatPercent(meta.ctr)}` : 'Meta unavailable'} />
              </div>
              <p style={{ margin: '10px 0 0', color: '#6B6B6B', fontSize: 12 }}>
                Comparison logic: today vs yesterday, 7d vs previous 7d, and for 30d selection the previous 30d baseline.
              </p>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Quick links for deeper analysis">Next drilldown</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[
                  ['Acquisition & Traffic', '/acquisition-traffic'],
                  ['Meta Ads', '/meta'],
                  ['Sales Funnel', '/sales-funnel'],
                  ['Today Action Plan', '/today-action-plan'],
                ].map(([label, href]) => (
                  <a key={label} href={href} style={{ textDecoration: 'none' }}>
                    <Card>
                      <div style={{ color: '#722F37', fontSize: 14, fontWeight: 900 }}>{label}</div>
                      <div style={{ color: '#6B6B6B', fontSize: 12, marginTop: 4 }}>Open detail page</div>
                    </Card>
                  </a>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Technical checks live in Data Quality">Data Quality</SectionTitle>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                  <MetricCard label="GA4 status" value={siteBehavior?.hasGa4Rows ? 'Connected' : 'Missing data'} tone={siteBehavior?.hasGa4Rows ? 'good' : 'warning'} />
                  <MetricCard label="Meta platform attribution" value={meta?.attributionAvailable ? 'Available' : 'Missing data'} tone={meta?.attributionAvailable ? 'good' : 'warning'} />
                  <MetricCard label="True Shopify CAC/ROAS attribution" value="Missing" tone="warning" />
                  <MetricCard label="Tracking status" value={siteBehavior?.hasSessionData ? 'Sessions visible' : 'Needs review'} tone={siteBehavior?.hasSessionData ? 'good' : 'warning'} />
                </div>
                <p style={{ margin: '14px 0 0', color: '#6B6B6B', fontSize: 13 }}>
                  Need diagnostics? Open <a href="/data-quality" style={{ color: '#722F37', fontWeight: 800 }}>Data Quality</a>.
                </p>
              </Card>
            </PageSection>
          </>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Could not load the business overview. Check the server database connection.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

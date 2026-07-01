import { connection } from 'next/server';
import { BusinessOverviewDailyClient } from '@/components/BusinessOverviewDailyClient';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedBusinessOverview, getCachedCustomerIntelligence, getCachedMetaAdsPerformance, getCachedSiteBehavior, getCachedTodayActionPlan, rangeCacheArgs } from '@/lib/cachedDb';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

function stageSlug(stage: string) {
  return stage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function statusTone(status: string): 'default' | 'good' | 'warning' {
  return status === 'Good' ? 'good' : status === 'Critical' || status === 'Missing data' ? 'warning' : 'default';
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
  const [businessResult, actionPlanResult, customerResult, siteBehaviorResult, metaResult] = await Promise.all([
    timeAsync('page:/business-overview getBusinessOverview', () => getCachedBusinessOverview()),
    timeAsync('page:/business-overview getTodayActionPlan', () => getCachedTodayActionPlan()),
    timeAsync('page:/business-overview getCustomerIntelligence', () => getCachedCustomerIntelligence()),
    timeAsync('page:/business-overview getSiteBehavior', () => getCachedSiteBehavior(...rangeArgs)),
    timeAsync('page:/business-overview getMetaAdsPerformance', () => getCachedMetaAdsPerformance()),
  ]);

  const business = businessResult.ok ? businessResult.metrics : null;
  const actionPlan = actionPlanResult.ok ? actionPlanResult.metrics : null;
  const customers = customerResult.ok ? customerResult.metrics.customers : [];
  const siteBehavior = siteBehaviorResult.ok ? siteBehaviorResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const highPriorityActions = actionPlan?.topActions.filter((action) => action.priority === 'Critical' || action.priority === 'High').length ?? 0;
  const stageCounts = Array.from(
    customers.reduce((map, customer) => {
      map.set(customer.funnelStage, (map.get(customer.funnelStage) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );
  const stageLabels = ['Quiz Completed', 'Needs to Rate Wines', 'Rated At Least 1 Wine', 'Ready for Smart Box', 'Repeat Buyer', 'Subscriber'];

  const trafficSessions = siteBehavior?.series.reduce((sum, row) => sum + (row.sessions ?? 0), 0) ?? 0;
  const ratingsCount = siteBehavior?.totalRatings ?? 0;
  const cards = business
    ? [
        statusCard(
          'Traffic',
          siteBehavior?.hasGa4Rows ? (trafficSessions > 0 ? 'Good' : 'Watch') : 'Missing data',
          siteBehavior?.hasGa4Rows ? `${formatNumber(trafficSessions)} sessions` : 'No GA4 rows',
          siteBehavior?.hasGa4Rows ? 'GA4 traffic is available for this period.' : 'GA4 data needs attention.',
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
          'Action Needed',
          highPriorityActions > 0 ? 'Critical' : 'Good',
          `${formatNumber(highPriorityActions)} high priority`,
          highPriorityActions > 0 ? 'Open today action plan first.' : 'No urgent action flagged.',
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
                <BusinessOverviewDailyClient siteSeries={siteBehavior.series} metaDaily={meta?.daily ?? []} hasGa4Rows={siteBehavior.hasGa4Rows} />
              </PageSection>
            ) : null}

            {actionPlan ? (
              <PageSection>
                <SectionTitle sub="Top 3 actions only">What should I do today?</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {actionPlan.topActions.slice(0, 3).map((action) => (
                    <Card key={`${action.priority}.${action.businessProblem}`}>
                      <div style={{ color: action.priority === 'Critical' || action.priority === 'High' ? '#B45309' : '#2D6A4F', fontSize: 12, fontWeight: 800 }}>
                        {action.priority}
                      </div>
                      <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, marginTop: 6 }}>
                        {action.businessProblem}
                      </div>
                      <p style={{ margin: '8px 0 10px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
                        {action.suggestedAction}
                      </p>
                      <a href={action.relatedPage} style={{ color: '#722F37', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open page</a>
                    </Card>
                  ))}
                </div>
              </PageSection>
            ) : null}

            <PageSection>
              <SectionTitle sub="Click a stage to open the focused funnel page">Funnel Snapshot</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {stageLabels.map((stage) => {
                  const count = stageCounts.find(([label]) => label === stage)?.[1] ?? 0;
                  return (
                    <a key={stage} href={`/sales-funnel?stage=${stageSlug(stage)}`} style={{ textDecoration: 'none' }}>
                      <Card>
                        <div style={{ color: '#722F37', fontSize: 20, fontWeight: 900 }}>{formatNumber(count)}</div>
                        <div style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 800, marginTop: 4 }}>{stage}</div>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Technical checks live in Data Quality">Data Quality</SectionTitle>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                  <MetricCard label="GA4 status" value={siteBehavior?.hasGa4Rows ? 'Connected' : 'Missing data'} tone={siteBehavior?.hasGa4Rows ? 'good' : 'warning'} />
                  <MetricCard label="Meta attribution" value="True CAC/ROAS unavailable" tone="warning" />
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

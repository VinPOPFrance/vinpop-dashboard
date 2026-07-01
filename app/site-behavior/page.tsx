import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { LineChart } from '@/components/dashboard/LineChart';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getSiteBehavior } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

function availability(value: boolean) {
  return value ? 'Available' : 'Unavailable';
}

export default async function SiteBehaviorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const result = await getSiteBehavior(range);
  const metrics = result.ok ? result.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Site Behavior" subtitle="Do visitors stay, click, browse, and move toward purchase?" />
      <PageSection>
        <SectionTitle sub={`Available behavior signals · ${range.label}`}>Behavior Health</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate daily metrics only. No customer personal data or individual orders are displayed.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <MetricCard label="Traffic" value={availability(metrics.sessionsPerDayAvailable)} tone={metrics.sessionsPerDayAvailable ? 'good' : 'warning'} />
              <MetricCard label="Engagement" value={availability(metrics.pagesPerSessionAvailable || metrics.clicksPerSessionAvailable)} tone="warning" />
              <MetricCard label="Checkout" value={`${formatNumber(metrics.totalAbandonedCheckouts)} abandoned`} tone={metrics.totalAbandonedCheckouts > metrics.totalOrders ? 'warning' : 'good'} />
              <MetricCard label="Rating engagement" value={`${formatNumber(metrics.totalRatings)} ratings`} />
              <MetricCard label="Orders" value={formatNumber(metrics.totalOrders)} />
              <MetricCard label="Quizzes" value={formatNumber(metrics.totalQuizzes)} />
              <MetricCard label="Checkout abandonment" value={formatPercent(metrics.checkoutAbandonmentRate)} tone={(metrics.checkoutAbandonmentRate ?? 0) > 50 ? 'warning' : 'default'} />
              <MetricCard label="Purchase conversion" value={formatPercent(metrics.purchaseConversionRate)} />
            </div>

            {!metrics.hasSessionData ? (
              <Card style={{ marginBottom: 16, borderColor: '#F2C94C', background: '#FFFCF0' }}>
                <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
                  Missing tracking: visitor/session/page/click behavior is unavailable or empty. Shopify orders, abandoned checkouts, quizzes, and ratings are still shown.
                </p>
              </Card>
            ) : null}

            <PageSection>
              <SectionTitle sub="Daily movement from available tables">Daily Signals</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <Card>
                  <SectionTitle>Sessions</SectionTitle>
                  <LineChart data={metrics.series.map((row) => ({ label: row.date, value: row.sessions ?? 0 }))} color="#2D6A4F" />
                </Card>
                <Card>
                  <SectionTitle>Orders</SectionTitle>
                  <LineChart data={metrics.series.map((row) => ({ label: row.date, value: row.orders }))} color="#722F37" />
                </Card>
                <Card>
                  <SectionTitle>Abandoned Checkouts</SectionTitle>
                  <LineChart data={metrics.series.map((row) => ({ label: row.date, value: row.abandonedCheckouts }))} color="#B45309" />
                </Card>
                <Card>
                  <SectionTitle>Ratings</SectionTitle>
                  <LineChart data={metrics.series.map((row) => ({ label: row.date, value: row.ratings }))} color="#A67C00" />
                </Card>
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="What we can and cannot calculate today">Behavior Readiness</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {[
                  ['Visitors/day', metrics.visitorsPerDayAvailable],
                  ['Sessions/day', metrics.sessionsPerDayAvailable],
                  ['Page views/day', metrics.pageViewsPerDayAvailable],
                  ['Clicks/session', metrics.clicksPerSessionAvailable],
                  ['Pages/session', metrics.pagesPerSessionAvailable],
                  ['Avg session duration', metrics.averageSessionDurationAvailable],
                ].map(([label, available]) => (
                  <Card key={label as string}>
                    <div style={{ color: available ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 700 }}>
                      {label as string}: {availability(Boolean(available))}
                    </div>
                  </Card>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Plain-language interpretation">Interpretation</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {metrics.insights.map((insight) => (
                  <Card key={insight}>
                    <p style={{ margin: 0, color: insight.includes('unavailable') || insight.includes('exceed') || insight.includes('low') ? '#B45309' : '#2D6A4F', fontSize: 13, fontWeight: 700 }}>
                      {insight}
                    </p>
                  </Card>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle>Period Totals</SectionTitle>
              <Card>
                <BarChart
                  data={[
                    { label: 'Orders', value: metrics.totalOrders, color: '#722F37' },
                    { label: 'Abandoned checkouts', value: metrics.totalAbandonedCheckouts, color: '#B45309' },
                    { label: 'Quizzes', value: metrics.totalQuizzes, color: '#2D6A4F' },
                    { label: 'Ratings', value: metrics.totalRatings, color: '#A67C00' },
                  ]}
                />
              </Card>
            </PageSection>
          </>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Site behavior could not be loaded safely.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

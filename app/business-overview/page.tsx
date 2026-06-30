import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DonutChart } from '@/components/DonutChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TrendBadge } from '@/components/dashboard/TrendBadge';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getBusinessOverview, getBusinessOverviewPeriodTrends, getCustomerIntelligence, getTodayActionPlan } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

function stageSlug(stage: string) {
  return stage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

type OverviewProductRow = Record<string, unknown> & {
  product: string;
  sku: string;
  netRevenue: number;
  discount: number;
  quantity: number;
};

const overviewProductColumns: SortableColumn<OverviewProductRow>[] = [
  { key: 'product', label: 'Product', type: 'text', width: 220 },
  { key: 'sku', label: 'SKU', type: 'text' },
  { key: 'netRevenue', label: 'Net revenue', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'quantity', label: 'Qty', type: 'number' },
];

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid #E8E6E1',
  borderRadius: 999,
  padding: '8px 12px',
  color: '#722F37',
  background: '#FFFFFF',
  fontSize: 12,
  fontWeight: 700,
  textDecoration: 'none',
};

export default async function BusinessOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);
  const [result, actionPlanResult, customerResult, trendsResult] = await Promise.all([
    getBusinessOverview(),
    getTodayActionPlan(),
    getCustomerIntelligence(),
    getBusinessOverviewPeriodTrends(range),
  ]);
  const metrics = result.ok ? result.metrics : null;
  const actionPlan = actionPlanResult.ok ? actionPlanResult.metrics : null;
  const customers = customerResult.ok ? customerResult.metrics.customers : [];
  const trends = trendsResult.ok ? trendsResult.metrics : null;
  const stageCounts = Array.from(
    customers.reduce((map, customer) => {
      map.set(customer.funnelStage, (map.get(customer.funnelStage) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);
  const keyStages = [
    'Taste Kit Buyer',
    'Needs to Rate Wines',
    'Rated At Least 1 Wine',
    'Ready for Smart Box',
    'Smart Box Buyer',
    'Repeat Buyer',
    'Ready for Subscription',
  ];
  const message = result.ok
    ? 'High-level Shopify business overview loaded from aggregate queries.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load the business overview. Check DATABASE_URL, database availability, SSL settings, and network access.';
  const cards = metrics
    ? [
        { label: 'Total revenue', value: formatEuro(metrics.totalRevenue) },
        { label: 'Total orders', value: formatNumber(metrics.totalOrders) },
        { label: 'Average order value', value: formatEuro(metrics.averageOrderValue) },
        { label: 'Paid orders', value: formatNumber(metrics.paidOrders) },
        { label: 'Cancelled orders', value: formatNumber(metrics.cancelledOrders) },
        { label: 'Abandoned checkouts', value: formatNumber(metrics.abandonedCheckoutCount) },
        { label: 'Product discounts', value: formatEuro(metrics.totalProductDiscounts) },
        { label: 'Total quantity sold', value: formatNumber(metrics.totalQuantitySold) },
        { label: 'Total line items', value: formatNumber(metrics.totalLineItems) },
      ]
    : [];
  const startupCards = metrics
    ? [
        { label: 'Startup Pack orders', value: formatNumber(metrics.startupPackOrders) },
        { label: 'Free bottle quantity', value: formatNumber(metrics.freeQuantityEstimate) },
        {
          label: 'Avg free bottles/pack',
          value: formatNumber(metrics.averageFreeBottlesPerStartupPackOrder),
        },
        { label: 'Product discounts', value: formatEuro(metrics.totalProductDiscounts) },
        { label: 'Total quantity moved', value: formatNumber(metrics.totalQuantitySold) },
        { label: 'Paid quantity', value: formatNumber(metrics.paidQuantityEstimate) },
        { label: 'Free quantity', value: formatNumber(metrics.freeQuantityEstimate) },
        { label: 'Free quantity %', value: formatPercent(metrics.freeQuantityPercentage) },
      ]
    : [];
  const retentionCards = metrics
    ? [
        { label: 'Repeat customers', value: formatNumber(metrics.repeatCustomers) },
        { label: 'Reorder rate', value: formatPercent(metrics.reorderRate) },
        { label: 'One-time customers', value: formatNumber(metrics.oneTimeCustomers) },
        { label: 'Later-order revenue', value: formatEuro(metrics.laterOrderRevenue) },
        { label: 'Repeat revenue share', value: formatPercent(metrics.repeatRevenueShare) },
        { label: 'Startup Pack reorder rate', value: formatPercent(metrics.startupPackReorderRate) },
        { label: 'Users with ratings', value: formatNumber(metrics.usersWithRatings) },
        { label: 'Ratings per user', value: formatNumber(metrics.ratingsPerUser) },
      ]
    : [];
  const linkCards = [
    { href: '/startup-pack-analysis', title: 'Startup Packs', subtitle: 'Pack economics and free bottle stock impact' },
    { href: '/stock-movement-summary', title: 'Stock Movement', subtitle: 'Paid vs free product movement' },
    { href: '/acquisition-economics-basic', title: 'Acquisition Basic', subtitle: 'Rough acquisition economics' },
  ];
  const retentionLinkCards = [
    { href: '/repeat-customers', title: 'Repeat Customers', subtitle: 'Reorder rate and repeat revenue' },
    { href: '/startup-pack-retention', title: 'Startup Pack Retention', subtitle: 'Pack customers and later orders' },
    { href: '/ratings-conversion', title: 'Ratings Conversion', subtitle: 'Ratings activity and matching status' },
    { href: '/product-repeat-signals', title: 'Product Repeat Signals', subtitle: 'Products connected to later orders' },
    { href: '/customer-lifecycle', title: 'Customer Lifecycle', subtitle: 'Acquisition to repeat purchase health' },
  ];
  const intelligenceLinkCards = [
    { href: '/ratings-intelligence', title: 'Ratings Intelligence', subtitle: 'Wine-level satisfaction signals' },
    { href: '/food-pairing-intelligence', title: 'Food Pairing Intelligence', subtitle: 'Pairing coverage and positioning' },
    { href: '/meta', title: 'Meta Ads Performance', subtitle: 'Spend, clicks, and attribution readiness' },
    { href: '/customer-activity-readiness', title: 'Customer Activity Readiness', subtitle: 'Session tracking gap check' },
    { href: '/today-action-plan', title: 'Today Action Plan', subtitle: 'Prioritized next actions' },
  ];

  return (
    <DashboardLayout>
      <TopBar
        title="Business Overview"
        subtitle="High-level Shopify revenue, order, and product signals"
      />

      <PageSection>
        <SectionTitle sub={`Aggregate business snapshot · ${range.label}`}>Shopify Overview</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No individual orders or customer data are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
        </Card>

        {metrics ? (
          <>
            {trends ? (
              <PageSection>
                <SectionTitle sub="Current period vs previous same-length period">What Changed?</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <MetricCard label="Period revenue" value={formatEuro(trends.revenue.current)} hint={<TrendBadge trend={trends.revenue} />} tone={trends.revenue.status === 'good' ? 'good' : trends.revenue.status === 'warning' ? 'warning' : 'default'} />
                  <MetricCard label="Period orders" value={formatNumber(trends.orders.current)} hint={<TrendBadge trend={trends.orders} />} tone={trends.orders.status === 'good' ? 'good' : trends.orders.status === 'warning' ? 'warning' : 'default'} />
                  <MetricCard label="Paid orders" value={formatNumber(trends.paidOrders.current)} hint={<TrendBadge trend={trends.paidOrders} />} tone={trends.paidOrders.status === 'good' ? 'good' : trends.paidOrders.status === 'warning' ? 'warning' : 'default'} />
                  <MetricCard label="Average order value" value={formatEuro(trends.averageOrderValue.current)} hint={<TrendBadge trend={trends.averageOrderValue} />} tone={trends.averageOrderValue.status === 'good' ? 'good' : trends.averageOrderValue.status === 'warning' ? 'warning' : 'default'} />
                  <MetricCard label="Meta spend" value={formatEuro(trends.metaSpend.current)} hint={<TrendBadge trend={trends.metaSpend} />} tone="default" />
                  <MetricCard label="GA4 sessions" value={formatNumber(trends.ga4Sessions.current)} hint={<TrendBadge trend={trends.ga4Sessions} />} tone={trends.ga4Sessions.status === 'good' ? 'good' : trends.ga4Sessions.status === 'warning' ? 'warning' : 'default'} />
                </div>
              </PageSection>
            ) : null}

            <PageSection>
              <SectionTitle sub="These link to the full stage-driven funnel page">Customer Stage Filters</SectionTitle>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href="/sales-funnel" style={chipStyle}>All</a>
                  {keyStages.map((stage) => (
                    <a key={stage} href={`/sales-funnel?stage=${stageSlug(stage)}`} style={chipStyle}>
                      {stage}
                    </a>
                  ))}
                </div>
              </Card>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Stage counts and missing-data blockers">Sales Funnel Snapshot</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr)', gap: 16, marginBottom: 16 }}>
                <Card>
                  <BarChart
                    data={stageCounts.slice(0, 8).map(([label, value]) => ({
                      label,
                      value,
                      color: label.includes('Ready') || label.includes('Repeat') ? '#2D6A4F' : label.includes('Needs') ? '#B45309' : '#722F37',
                    }))}
                  />
                  <a href="/sales-funnel" style={{ color: '#722F37', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Open Sales Funnel</a>
                </Card>
                <Card>
                  <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Data Quality</div>
                  {[
                    'Visitor/session tracking is missing, so early funnel stages are unavailable.',
                    'Meta attribution to Shopify orders is missing, so CAC/ROAS remain unavailable.',
                    'Ratings-to-wine mapping uses public.mapping and is available for most ratings.',
                    'Shopify product IDs map through public.mapping.vp_id for most line items.',
                  ].map((item) => (
                    <p key={item} style={{ margin: '0 0 8px', color: item.includes('missing') ? '#B45309' : '#2D6A4F', fontSize: 13, fontWeight: 600 }}>
                      {item}
                    </p>
                  ))}
                </Card>
              </div>
            </PageSection>

            {actionPlan ? (
              <PageSection>
                <SectionTitle sub="Top 3 generated actions">What needs attention today</SectionTitle>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 12,
                  }}
                >
                  {actionPlan.topActions.slice(0, 3).map((action) => (
                    <Card key={`${action.priority}.${action.businessProblem}`}>
                      <div style={{ color: '#B45309', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        {action.priority}
                      </div>
                      <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                        {action.businessProblem}
                      </div>
                      <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' }}>
                        {action.suggestedAction}
                      </p>
                      <a href={action.relatedPage} style={{ color: '#722F37', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        Open related page
                      </a>
                    </Card>
                  ))}
                </div>
              </PageSection>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: 12,
              }}
            >
              {cards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>

            <PageSection>
              <SectionTitle sub="Visual read before the detailed cards">30-second Business Pulse</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                <Card>
                  <SectionTitle>Top Products by Net Revenue</SectionTitle>
                  <BarChart
                    data={metrics.topProducts.slice(0, 5).map((product) => ({
                      label: product.productName,
                      value: product.netRevenue,
                      color: '#722F37',
                    }))}
                  />
                </Card>
                <Card>
                  <SectionTitle>Repeat vs One-time</SectionTitle>
                  <DonutChart
                    data={[
                      { label: 'Repeat customers', value: metrics.repeatCustomers, color: '#2D6A4F' },
                      { label: 'One-time customers', value: metrics.oneTimeCustomers, color: '#B45309' },
                    ]}
                  />
                </Card>
                <Card>
                  <SectionTitle>Paid vs Free Product Movement</SectionTitle>
                  <DonutChart
                    data={[
                      { label: 'Paid quantity', value: metrics.paidQuantityEstimate, color: '#2D6A4F' },
                      { label: 'Free quantity', value: metrics.freeQuantityEstimate, color: '#B45309' },
                    ]}
                  />
                </Card>
              </div>

              <SectionTitle sub="Pack economics and inventory movement">
                Startup Pack & Stock Signals
              </SectionTitle>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: 12,
                }}
              >
                {startupCards.map((card) => (
                  <MetricCard key={card.label} label={card.label} value={card.value} />
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {linkCards.map((link) => (
                  <a key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                    <Card>
                      <div style={{ color: '#722F37', fontSize: 14, fontWeight: 700 }}>
                        {link.title}
                      </div>
                      <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.5, margin: '6px 0 0' }}>
                        {link.subtitle}
                      </p>
                    </Card>
                  </a>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Repeat purchase and engagement">
                Retention & Lifecycle Signals
              </SectionTitle>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: 12,
                }}
              >
                {retentionCards.map((card) => (
                  <MetricCard key={card.label} label={card.label} value={card.value} />
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {retentionLinkCards.map((link) => (
                  <a key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                    <Card>
                      <div style={{ color: '#722F37', fontSize: 14, fontWeight: 700 }}>
                        {link.title}
                      </div>
                      <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.5, margin: '6px 0 0' }}>
                        {link.subtitle}
                      </p>
                    </Card>
                  </a>
                ))}
              </div>
            </PageSection>

            <PageSection>
              <SectionTitle sub="New intelligence modules">Decision System Links</SectionTitle>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {intelligenceLinkCards.map((link) => (
                  <a key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                    <Card>
                      <div style={{ color: '#722F37', fontSize: 14, fontWeight: 700 }}>
                        {link.title}
                      </div>
                      <p style={{ color: '#6B6B6B', fontSize: 12, lineHeight: 1.5, margin: '6px 0 0' }}>
                        {link.subtitle}
                      </p>
                    </Card>
                  </a>
                ))}
              </div>
            </PageSection>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 28 }}>
              <div>
                <SectionTitle sub="Top 5 products by net revenue">Top Products</SectionTitle>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <SortableDataTable
                    columns={overviewProductColumns}
                    rows={metrics.topProducts.map((product) => ({
                      product: product.productName,
                      sku: product.sku,
                      netRevenue: product.netRevenue,
                      discount: product.totalDiscount,
                      quantity: product.totalQuantitySold,
                    }))}
                    initialSortKey="netRevenue"
                    enableSearch={false}
                  />
                </Card>
              </div>

              <div>
                <SectionTitle sub="Simple rule checks">Potential Issues</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.potentialIssues.map((issue) => (
                    <Card key={issue}>
                      <p
                        style={{
                          color:
                            issue === 'No major Shopify issue detected.' ? '#2D6A4F' : '#B45309',
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {issue}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

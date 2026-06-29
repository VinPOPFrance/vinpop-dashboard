import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getBusinessOverview, getTodayActionPlan } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

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

export default async function BusinessOverviewPage() {
  await connection();
  const [result, actionPlanResult] = await Promise.all([
    getBusinessOverview(),
    getTodayActionPlan(),
  ]);
  const metrics = result.ok ? result.metrics : null;
  const actionPlan = actionPlanResult.ok ? actionPlanResult.metrics : null;
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
        <SectionTitle sub="Aggregate business snapshot">Shopify Overview</SectionTitle>
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

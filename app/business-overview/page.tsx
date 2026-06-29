import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getBusinessOverview } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function BusinessOverviewPage() {
  await connection();
  const result = await getBusinessOverview();
  const metrics = result.ok ? result.metrics : null;
  const message = result.ok
    ? 'High-level Shopify business overview loaded from aggregate queries.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load the business overview. Check DATABASE_URL, database availability, SSL settings, and network access.';
  const cards = metrics
    ? [
        { label: 'Total revenue', value: formatMoney(metrics.totalRevenue) },
        { label: 'Total orders', value: formatNumber(metrics.totalOrders) },
        { label: 'Average order value', value: formatMoney(metrics.averageOrderValue) },
        { label: 'Paid orders', value: formatNumber(metrics.paidOrders) },
        { label: 'Cancelled orders', value: formatNumber(metrics.cancelledOrders) },
        { label: 'Abandoned checkouts', value: formatNumber(metrics.abandonedCheckoutCount) },
        { label: 'Product discounts', value: formatMoney(metrics.totalProductDiscounts) },
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
        { label: 'Product discounts', value: formatMoney(metrics.totalProductDiscounts) },
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
        { label: 'Later-order revenue', value: formatMoney(metrics.laterOrderRevenue) },
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: 12,
              }}
            >
              {cards.map((card) => (
                <Card key={card.label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>
                    {card.label}
                  </div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>
                    {card.value}
                  </div>
                </Card>
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
                  <Card key={card.label}>
                    <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>
                      {card.label}
                    </div>
                    <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>
                      {card.value}
                    </div>
                  </Card>
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
                  <Card key={card.label}>
                    <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>
                      {card.label}
                    </div>
                    <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>
                      {card.value}
                    </div>
                  </Card>
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 28 }}>
              <div>
                <SectionTitle sub="Top 5 products by net revenue">Top Products</SectionTitle>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>SKU</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                            Net revenue
                          </th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                            Discount
                          </th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topProducts.map((product) => (
                          <tr
                            key={`${product.productId}.${product.variantId}.${product.sku}`}
                            style={{ borderTop: '1px solid #E8E6E1' }}
                          >
                            <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                              {product.productName}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                              {product.sku}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                              {formatMoney(product.netRevenue)}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#B45309', textAlign: 'right' }}>
                              {formatMoney(product.totalDiscount)}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                              {formatNumber(product.totalQuantitySold)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getStartupPackAnalysis, type StartupPackProductRow } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ProductTable({ products }: { products: StartupPackProductRow[] }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>Vendor</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Qty</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                Gross value
              </th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                Discount value
              </th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                Net revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={`${product.productName}.${product.vendor}`} style={{ borderTop: '1px solid #E8E6E1' }}>
                <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                  {product.productName}
                </td>
                <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.vendor}</td>
                <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                  {formatNumber(product.quantity)}
                </td>
                <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                  {formatMoney(product.grossValue)}
                </td>
                <td style={{ padding: '10px 14px', color: '#B45309', textAlign: 'right' }}>
                  {formatMoney(product.discountValue)}
                </td>
                <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                  {formatMoney(product.netRevenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function StartupPackAnalysisPage() {
  await connection();
  const result = await getStartupPackAnalysis();
  const metrics = result.ok ? result.metrics : null;
  const message = result.ok
    ? 'Startup Pack economics loaded from aggregate Shopify line item data.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server.'
      : 'Could not load Startup Pack analysis. Check database availability and access.';
  const warning =
    metrics &&
    metrics.startupPackOrderCount > 0 &&
    (metrics.averageFreeBottlesPerStartupPackOrder === null ||
      metrics.averageFreeBottlesPerStartupPackOrder < 3 ||
      metrics.averageFreeBottlesPerStartupPackOrder > 4)
      ? 'Average free bottles per Startup Pack is outside the expected 3 to 4 range.'
      : metrics && metrics.startupPackOrderCount > 0 && metrics.freeBottleQuantity === 0
        ? 'Startup Pack orders exist but no free bottles were detected.'
        : null;
  const cards = metrics
    ? [
        { label: 'Startup Pack orders', value: formatNumber(metrics.startupPackOrderCount) },
        { label: 'Pack line items sold', value: formatNumber(metrics.startupPackLineItemsSold) },
        { label: 'Pack gross revenue', value: formatMoney(metrics.startupPackGrossRevenue) },
        { label: 'Pack net revenue', value: formatMoney(metrics.startupPackNetRevenue) },
        {
          label: 'Avg pack net/order',
          value: formatNumber(metrics.averageStartupPackNetRevenuePerOrder),
        },
        { label: 'Free bottle line items', value: formatNumber(metrics.freeBottleLineItemCount) },
        { label: 'Free bottle quantity', value: formatNumber(metrics.freeBottleQuantity) },
        { label: 'Free bottle gross value', value: formatMoney(metrics.freeBottleGrossValue) },
        { label: 'Free bottle discount', value: formatMoney(metrics.freeBottleDiscountValue) },
        {
          label: 'Paid item net in pack orders',
          value: formatMoney(metrics.paidItemsNetRevenueInStartupPackOrders),
        },
        {
          label: 'Avg free bottles/order',
          value: formatNumber(metrics.averageFreeBottlesPerStartupPackOrder),
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Startup Packs" subtitle="Startup Pack economics and stock impact" />

      <PageSection>
        <SectionTitle sub="Aggregate Startup Pack signals">Startup Pack Analysis</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No customer data or individual order details are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{message}</p>
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
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{card.value}</div>
                </Card>
              ))}
            </div>

            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <p style={{ margin: 0, color: warning ? '#B45309' : '#2D6A4F', fontSize: 13, fontWeight: 600 }}>
                {warning ??
                  'Stock movement may be higher than paid sales because free bottles are intentionally included in Startup Packs.'}
              </p>
            </Card>

            <PageSection>
              <SectionTitle sub="Sorted by quantity">Top Free Included Wines</SectionTitle>
              <ProductTable products={metrics.topFreeWinesByQuantity} />
            </PageSection>

            <PageSection>
              <SectionTitle sub="Sorted by gross value">Top Free Included Wines by Value</SectionTitle>
              <ProductTable products={metrics.topFreeWinesByGrossValue} />
            </PageSection>

            <PageSection>
              <SectionTitle sub="Paid Startup Pack products">Startup Pack Paid Products</SectionTitle>
              <ProductTable products={metrics.topPaidPackProducts} />
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

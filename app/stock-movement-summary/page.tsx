import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getStockMovementSummary } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function StockMovementSummaryPage() {
  await connection();
  const result = await getStockMovementSummary();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        { label: 'Total quantity moved', value: formatNumber(metrics.totalQuantityMoved) },
        { label: 'Paid quantity', value: formatNumber(metrics.totalPaidQuantity) },
        { label: 'Free quantity', value: formatNumber(metrics.totalFreeQuantity) },
        { label: 'Free quantity %', value: formatPercent(metrics.freeQuantityPercentage) },
        { label: 'Gross product value', value: formatMoney(metrics.totalGrossProductValue) },
        { label: 'Discount value', value: formatMoney(metrics.totalDiscountValue) },
        { label: 'Net product revenue', value: formatMoney(metrics.totalNetProductRevenue) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Stock Movement" subtitle="Paid and free product movement from Shopify orders" />

      <PageSection>
        <SectionTitle sub="Paid and discounted/free movement">Stock Movement Summary</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Stock movement includes both paid products and products included for free via discounts.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {cards.map((card) => (
                <Card key={card.label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{card.value}</div>
                </Card>
              ))}
            </div>

            <PageSection>
              <SectionTitle sub="Top 100 by quantity moved">Product Movement</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                        {[
                          'Product',
                          'Vendor',
                          'SKU',
                          'Moved',
                          'Paid',
                          'Free',
                          'Free %',
                          'Gross',
                          'Discount',
                          'Net',
                          'Avg net/unit',
                          'Orders',
                        ].map((header) => (
                          <th key={header} style={{ padding: '10px 14px', fontWeight: 700 }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.products.map((product) => (
                        <tr key={`${product.productName}.${product.sku}`} style={{ borderTop: '1px solid #E8E6E1' }}>
                          <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{product.productName}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.vendor}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.sku}</td>
                          <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>{formatNumber(product.totalQuantityMoved)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.paidQuantity)}</td>
                          <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatNumber(product.freeQuantity)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(product.freeQuantityPercentage)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(product.grossValue)}</td>
                          <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatMoney(product.discountValue)}</td>
                          <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>{formatMoney(product.netRevenue)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(product.averageNetRevenuePerUnit)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.orderCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

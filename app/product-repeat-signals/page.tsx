import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getProductRepeatSignals } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number | null): string {
  return value === null
    ? 'Unavailable'
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function ProductRepeatSignalsPage() {
  await connection();
  const result = await getProductRepeatSignals();
  const metrics = result.ok ? result.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Product Repeat Signals" subtitle="Products associated with later orders" />
      <PageSection>
        <SectionTitle sub="Top 100 by later-order revenue">Product Repeat Signals</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Products are aggregated by line_items. No individual orders or customers are displayed.
          </p>
        </Card>
        {metrics ? (
          <>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Product', 'Vendor', 'SKU', 'Moved', 'Paid', 'Free', 'Gross', 'Discount', 'Net', 'First qty', 'Later qty', 'First rev', 'Later rev', 'Repeat rev %', 'Orders', 'Repeat orders'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.products.map((product) => (
                      <tr key={`${product.productName}.${product.vendor}.${product.sku}`} style={{ borderTop: '1px solid #E8E6E1' }}>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{product.productName}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.vendor}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.sku}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.totalQuantityMoved)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.paidQuantity)}</td>
                        <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatNumber(product.freeQuantity)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(product.grossRevenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatMoney(product.discount)}</td>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>{formatMoney(product.netRevenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.firstOrderQuantity)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.laterOrderQuantity)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(product.firstOrderRevenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>{formatMoney(product.laterOrderRevenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(product.repeatRevenueShare)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.ordersContainingProduct)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(product.repeatCustomerOrdersContainingProduct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <PageSection>
              <SectionTitle sub="Simple aggregate observations">Potential Insights</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.potentialInsights.map((insight) => (
                  <Card key={insight}>
                    <p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 600 }}>{insight}</p>
                  </Card>
                ))}
              </div>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getShopifyProductsSummary } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function ShopifyProductsSummaryPage() {
  await connection();
  const result = await getShopifyProductsSummary();
  const freeQuantityDetected = result.ok && result.freeQuantityEstimate > 0;
  const discountDataPartiallyUnavailable =
    result.ok &&
    !result.discountFieldsDetected.includes('total_discount') &&
    !result.discountFieldsDetected.includes('discount_allocations');
  const message = result.ok
    ? result.products.length === 0
      ? 'No products were found in Shopify order line items.'
      : `Showing top ${result.products.length} products by aggregate net revenue.`
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load Shopify product aggregates. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Products"
        subtitle="Aggregate product sales from Shopify order line items"
      />

      <PageSection>
        <SectionTitle sub="Top 50 by revenue">Product Sales Summary</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Discount-aware product metrics. Products included for free in packs are separated when
            Shopify line item discount data is available.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {result.ok ? (
            <>
              <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13 }}>
                Total quantity sold: {formatNumber(result.totalQuantitySold)} · Total product
                discounts: {formatMoney(result.totalProductDiscounts)}
              </p>
              <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 13 }}>
                Discount fields detected: {result.discountFieldsDetected.join(', ') || 'none'}
              </p>
            </>
          ) : null}
        </Card>

        {freeQuantityDetected ? (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
              Free discounted items detected: {formatNumber(result.freeQuantityEstimate)} units.
              Stock movement may exceed paid product sales.
            </p>
          </Card>
        ) : null}

        {discountDataPartiallyUnavailable ? (
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
              Discount details are partially unavailable because no total_discount or
              discount_allocations fields were detected in line_items.
            </p>
          </Card>
        ) : null}

        {result.ok && result.products.length > 0 ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product ID</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Variant ID</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>SKU</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Vendor</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Quantity sold
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Paid qty
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Free qty
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Gross revenue
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Discount
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Net revenue
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Discount rate
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Orders
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Avg net price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.products.map((product) => (
                    <tr
                      key={`${product.productId}.${product.variantId}.${product.sku}`}
                      style={{ borderTop: '1px solid #E8E6E1' }}
                    >
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                        {product.productName}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                        {product.productId}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                        {product.variantId}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.sku}</td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{product.vendor}</td>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                        {formatNumber(product.totalQuantitySold)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                        {formatNumber(product.paidQuantityEstimate)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#B45309', textAlign: 'right' }}>
                        {formatNumber(product.freeQuantityEstimate)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                        {formatMoney(product.grossRevenue)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#B45309', textAlign: 'right' }}>
                        {formatMoney(product.totalDiscount)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                        {formatMoney(product.netRevenue)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                        {formatPercent(product.discountRatePercentage)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                        {formatNumber(product.orderCount)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B', textAlign: 'right' }}>
                        {formatMoney(product.averageNetItemPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

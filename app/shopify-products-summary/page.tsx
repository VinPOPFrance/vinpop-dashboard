import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getShopifyProductsSummary } from '@/lib/db';
import { formatEuro, formatNumber } from '@/lib/format';

export const runtime = 'nodejs';

type ProductTableRow = Record<string, unknown> & {
  product: string;
  productId: string;
  variantId: string;
  sku: string;
  vendor: string;
  quantitySold: number;
  paidQuantity: number;
  freeQuantity: number;
  grossRevenue: number;
  discount: number;
  netRevenue: number;
  discountRate: number;
  orders: number;
  averageNetPrice: number;
};

const productColumns: SortableColumn<ProductTableRow>[] = [
  { key: 'product', label: 'Product', type: 'text', width: 220 },
  { key: 'sku', label: 'SKU', type: 'text' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'quantitySold', label: 'Quantity sold', type: 'number' },
  { key: 'paidQuantity', label: 'Paid quantity', type: 'number' },
  { key: 'freeQuantity', label: 'Free quantity', type: 'number' },
  { key: 'grossRevenue', label: 'Gross revenue', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'netRevenue', label: 'Net revenue', type: 'money' },
  { key: 'discountRate', label: 'Discount rate', type: 'percent' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'averageNetPrice', label: 'Avg net price', type: 'money' },
  { key: 'productId', label: 'Product ID', type: 'text' },
  { key: 'variantId', label: 'Variant ID', type: 'text' },
];

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
                discounts: {formatEuro(result.totalProductDiscounts)}
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
            <SortableDataTable
              columns={productColumns}
              rows={result.products.map((product) => ({
                product: product.productName,
                productId: product.productId,
                variantId: product.variantId,
                sku: product.sku,
                vendor: product.vendor,
                quantitySold: product.totalQuantitySold,
                paidQuantity: product.paidQuantityEstimate,
                freeQuantity: product.freeQuantityEstimate,
                grossRevenue: product.grossRevenue,
                discount: product.totalDiscount,
                netRevenue: product.netRevenue,
                discountRate: product.discountRatePercentage,
                orders: product.orderCount,
                averageNetPrice: product.averageNetItemPrice,
              }))}
              initialSortKey="netRevenue"
              searchPlaceholder="Search product, SKU, vendor..."
            />
          </Card>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

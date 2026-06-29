import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getStockMovementSummary } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

type StockTableRow = Record<string, unknown> & {
  product: string;
  vendor: string;
  sku: string;
  moved: number;
  paid: number;
  free: number;
  freeRate: number | null;
  gross: number;
  discount: number;
  net: number;
  averageNetUnit: number;
  orders: number;
};

const stockColumns: SortableColumn<StockTableRow>[] = [
  { key: 'product', label: 'Product', type: 'text', width: 220 },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'sku', label: 'SKU', type: 'text' },
  { key: 'moved', label: 'Moved', type: 'number' },
  { key: 'paid', label: 'Paid', type: 'number' },
  { key: 'free', label: 'Free', type: 'number' },
  { key: 'freeRate', label: 'Free %', type: 'percent' },
  { key: 'gross', label: 'Gross', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'net', label: 'Net', type: 'money' },
  { key: 'averageNetUnit', label: 'Avg net/unit', type: 'money' },
  { key: 'orders', label: 'Orders', type: 'number' },
];

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
        { label: 'Gross product value', value: formatEuro(metrics.totalGrossProductValue) },
        { label: 'Discount value', value: formatEuro(metrics.totalDiscountValue) },
        { label: 'Net product revenue', value: formatEuro(metrics.totalNetProductRevenue) },
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
                <SortableDataTable
                  columns={stockColumns}
                  rows={metrics.products.map((product) => ({
                    product: product.productName,
                    vendor: product.vendor,
                    sku: product.sku,
                    moved: product.totalQuantityMoved,
                    paid: product.paidQuantity,
                    free: product.freeQuantity,
                    freeRate: product.freeQuantityPercentage,
                    gross: product.grossValue,
                    discount: product.discountValue,
                    net: product.netRevenue,
                    averageNetUnit: product.averageNetRevenuePerUnit,
                    orders: product.orderCount,
                  }))}
                  initialSortKey="moved"
                  searchPlaceholder="Search product, SKU, vendor..."
                />
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

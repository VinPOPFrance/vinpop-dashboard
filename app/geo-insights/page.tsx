import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DonutChart } from '@/components/DonutChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getGeoInsights } from '@/lib/db';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

type GeoRow = Record<string, unknown> & {
  city: string;
  region: string;
  customers: number;
  orders: number;
  revenue: number;
  classification: string;
};

const columns: SortableColumn<GeoRow>[] = [
  { key: 'city', label: 'City', type: 'text', width: 180 },
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'customers', label: 'Customers', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'revenue', label: 'Revenue', type: 'money' },
  { key: 'classification', label: 'Classification', type: 'text', width: 180 },
];

export default async function GeoInsightsPage() {
  await connection();
  const result = await getGeoInsights();
  const metrics = result.ok ? result.metrics : null;
  const rows: GeoRow[] = metrics
    ? metrics.topCities.map((row) => ({
        city: row.city,
        region: row.region,
        customers: row.customers,
        orders: row.orders,
        revenue: row.revenue,
        classification: row.classification,
      }))
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Geo Insights" subtitle="Buyer location aggregates for Meta targeting decisions" />
      <PageSection>
        <SectionTitle sub="Aggregate city/region data only. No street addresses, phones, or customer names.">City vs Periphery</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Privacy-safe geography: city and region aggregates only.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <MetricCard label="Buyers with city" value={formatNumber(metrics.buyersWithCityData)} />
              <MetricCard label="Missing city" value={formatNumber(metrics.buyersMissingCityData)} tone={metrics.buyersMissingCityData > 0 ? 'warning' : 'good'} />
              <MetricCard label="Big city customers" value={formatPercent(metrics.bigCityCustomerShare)} />
              <MetricCard label="Periphery customers" value={formatPercent(metrics.peripheryCustomerShare)} />
              <MetricCard label="Big city revenue" value={formatEuro(metrics.bigCityRevenue)} />
              <MetricCard label="Periphery revenue" value={formatEuro(metrics.peripheryRevenue)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              <Card>
                <SectionTitle>Customers Split</SectionTitle>
                <DonutChart
                  data={[
                    { label: 'Big city', value: metrics.bigCityCustomers, color: '#722F37' },
                    { label: 'Periphery / smaller city', value: metrics.peripheryCustomers, color: '#2D6A4F' },
                  ]}
                />
              </Card>
              <Card>
                <SectionTitle>Revenue Split</SectionTitle>
                <DonutChart
                  data={[
                    { label: 'Big city', value: metrics.bigCityRevenue, color: '#722F37' },
                    { label: 'Periphery / smaller city', value: metrics.peripheryRevenue, color: '#2D6A4F' },
                  ]}
                />
              </Card>
              <Card>
                <SectionTitle>Top Cities by Customers</SectionTitle>
                <BarChart data={metrics.topCities.slice(0, 8).map((row) => ({ label: row.city, value: row.customers, color: row.classification === 'Big city' ? '#722F37' : '#2D6A4F' }))} />
              </Card>
            </div>

            <PageSection>
              <SectionTitle sub={metrics.heuristicNote}>Recommended Action</SectionTitle>
              <Card>
                <p style={{ margin: 0, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>{metrics.recommendation}</p>
              </Card>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Aggregate table by city">City Table</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <SortableDataTable columns={columns} rows={rows} initialSortKey="revenue" searchPlaceholder="Search city or region..." />
              </Card>
            </PageSection>
          </>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Geography metrics could not be loaded safely.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

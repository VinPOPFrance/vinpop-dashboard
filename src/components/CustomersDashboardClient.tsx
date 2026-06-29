'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { CustomerProductSummary, CustomerRatingsSummary, RatedWineDetail } from '@/lib/db';

type CustomerRow = Record<string, unknown> & {
  customerId: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
  bottlesBought: number;
  bottlesRated: number;
  ratedPercentage: number | null;
  unratedBottlesRemaining: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  lastRatingDate: string | null;
  repeatCustomer: string;
  startupPackBuyer: string;
  smartBoxReady: string;
  subscriptionReady: string;
  funnelStage: string;
  nextAction: string;
};

type ProductRow = Record<string, unknown> & CustomerProductSummary;
type RatedWineRow = Record<string, unknown> & RatedWineDetail;

const customerColumns: SortableColumn<CustomerRow>[] = [
  { key: 'email', label: 'Email', type: 'text', width: 240 },
  { key: 'totalSpent', label: 'Total spent', type: 'money' },
  { key: 'ordersCount', label: 'Orders', type: 'number' },
  { key: 'bottlesBought', label: 'Bottles bought', type: 'number' },
  { key: 'bottlesRated', label: 'Bottles rated', type: 'number' },
  { key: 'ratedPercentage', label: '% rated', type: 'percent' },
  { key: 'unratedBottlesRemaining', label: 'Unrated est.', type: 'number' },
  { key: 'firstOrderDate', label: 'First order', type: 'date' },
  { key: 'lastOrderDate', label: 'Last order', type: 'date' },
  { key: 'lastRatingDate', label: 'Last rating', type: 'date' },
  { key: 'repeatCustomer', label: 'Repeat', type: 'text' },
  { key: 'smartBoxReady', label: 'Smart Box ready', type: 'text' },
  { key: 'subscriptionReady', label: 'Subscription ready', type: 'text' },
  { key: 'funnelStage', label: 'Stage', type: 'text' },
  { key: 'nextAction', label: 'Next action', type: 'text', width: 260 },
];

const productColumns: SortableColumn<ProductRow>[] = [
  { key: 'productName', label: 'Product / wine', type: 'text', width: 220 },
  { key: 'shopifyProductId', label: 'Shopify product ID', type: 'text' },
  { key: 'quantityBought', label: 'Quantity bought', type: 'number' },
  { key: 'grossRevenue', label: 'Gross revenue', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'netRevenue', label: 'Net revenue', type: 'money' },
  { key: 'ratedCount', label: 'Rated count', type: 'number' },
  { key: 'unratedCount', label: 'Unrated count', type: 'number' },
  { key: 'ratingStatus', label: 'Rating status', type: 'text' },
];

const ratedWineColumns: SortableColumn<RatedWineRow>[] = [
  { key: 'wineName', label: 'Wine / product', type: 'text', width: 220 },
  { key: 'shopifyProductId', label: 'Shopify product ID', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'ratingLabel', label: 'Rating', type: 'text' },
  { key: 'ratingDate', label: 'Rating date', type: 'date' },
];

export function CustomersDashboardClient({ customers }: { customers: CustomerRatingsSummary[] }) {
  const [stageFilter, setStageFilter] = useState('All');
  const [hasRatingsFilter, setHasRatingsFilter] = useState('All');
  const [needsRatingFilter, setNeedsRatingFilter] = useState('All');
  const [repeatFilter, setRepeatFilter] = useState('All');
  const [startupFilter, setStartupFilter] = useState('All');
  const [smartBoxFilter, setSmartBoxFilter] = useState('All');
  const [subscriptionFilter, setSubscriptionFilter] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.customerId ?? '');
  const stages = ['All', ...Array.from(new Set(customers.map((customer) => customer.funnelStage)))];
  const filteredCustomers = customers.filter((customer) => {
    if (stageFilter !== 'All' && customer.funnelStage !== stageFilter) return false;
    if (hasRatingsFilter === 'Has ratings' && customer.bottlesRated === 0) return false;
    if (hasRatingsFilter === 'No ratings' && customer.bottlesRated > 0) return false;
    if (needsRatingFilter === 'Needs rating' && customer.unratedBottlesRemaining <= 0) return false;
    if (repeatFilter === 'Repeat only' && !customer.repeatCustomer) return false;
    if (startupFilter === 'Startup Pack only' && !customer.startupPackBuyer) return false;
    if (smartBoxFilter === 'Ready only' && !customer.smartBoxReady) return false;
    if (subscriptionFilter === 'Ready only' && !customer.subscriptionReady) return false;
    return true;
  });
  const selectedCustomer = customers.find((customer) => customer.customerId === selectedCustomerId) ?? filteredCustomers[0];
  const rows = filteredCustomers.map((customer) => ({
    customerId: customer.customerId,
    email: customer.email,
    totalSpent: customer.totalSpent,
    ordersCount: customer.ordersCount,
    bottlesBought: customer.bottlesBought,
    bottlesRated: customer.bottlesRated,
    ratedPercentage: customer.ratedPercentage,
    unratedBottlesRemaining: customer.unratedBottlesRemaining,
    firstOrderDate: customer.firstOrderDate,
    lastOrderDate: customer.lastOrderDate,
    lastRatingDate: customer.lastRatingDate,
    repeatCustomer: customer.repeatCustomer ? 'Yes' : 'No',
    startupPackBuyer: customer.startupPackBuyer ? 'Yes' : 'No',
    smartBoxReady: customer.smartBoxReady ? 'Yes' : 'No',
    subscriptionReady: customer.subscriptionReady ? 'Yes' : 'No',
    funnelStage: customer.funnelStage,
    nextAction: customer.nextAction,
  }));
  const totals = useMemo(
    () => ({
      revenue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
      orders: customers.reduce((sum, customer) => sum + customer.ordersCount, 0),
      bought: customers.reduce((sum, customer) => sum + customer.bottlesBought, 0),
      rated: customers.reduce((sum, customer) => sum + customer.bottlesRated, 0),
      repeat: customers.filter((customer) => customer.repeatCustomer).length,
    }),
    [customers],
  );
  const stageData = stages
    .filter((stage) => stage !== 'All')
    .map((stage) => ({ label: stage, value: customers.filter((customer) => customer.funnelStage === stage).length, color: '#722F37' }));

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        <MetricCard label="Customers" value={formatNumber(customers.length)} />
        <MetricCard label="Total spent" value={formatEuro(totals.revenue)} />
        <MetricCard label="Orders" value={formatNumber(totals.orders)} />
        <MetricCard label="Bottles bought" value={formatNumber(totals.bought)} />
        <MetricCard label="Bottles rated" value={formatNumber(totals.rated)} />
        <MetricCard label="Overall % rated" value={formatPercent(totals.bought === 0 ? null : (totals.rated / totals.bought) * 100)} />
        <MetricCard label="Repeat customers" value={formatNumber(totals.repeat)} />
      </div>

      <PageSection>
        <SectionTitle sub="Click a stage to filter the customer table">Customer Stage Mix</SectionTitle>
        <Card>
          <BarChart data={stageData} onBarClick={(label) => setStageFilter(label)} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {stages.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                style={{
                  border: stageFilter === stage ? '1px solid #722F37' : '1px solid #E8E6E1',
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: stageFilter === stage ? '#722F37' : '#FFFFFF',
                  color: stageFilter === stage ? '#FFFFFF' : '#6B6B6B',
                  cursor: 'pointer',
                }}
              >
                {stage}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <select value={hasRatingsFilter} onChange={(event) => setHasRatingsFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Has ratings</option>
              <option>No ratings</option>
            </select>
            <select value={needsRatingFilter} onChange={(event) => setNeedsRatingFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Needs rating</option>
            </select>
            <select value={repeatFilter} onChange={(event) => setRepeatFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Repeat only</option>
            </select>
            <select value={startupFilter} onChange={(event) => setStartupFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Startup Pack only</option>
            </select>
            <select value={smartBoxFilter} onChange={(event) => setSmartBoxFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Ready only</option>
            </select>
            <select value={subscriptionFilter} onChange={(event) => setSubscriptionFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Ready only</option>
            </select>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Click a customer to inspect purchases and ratings">Customers</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <SortableDataTable
              columns={customerColumns}
              rows={rows}
              initialSortKey="totalSpent"
              searchPlaceholder="Search customer email, stage, or action..."
              getRowKey={(row) => row.customerId}
              selectedRowKey={selectedCustomer?.customerId}
              onRowClick={(row) => setSelectedCustomerId(row.customerId)}
            />
          </Card>
          <Card>
            <div style={{ color: '#1A1A1A', fontWeight: 700, marginBottom: 8 }}>{selectedCustomer?.email ?? 'No customer selected'}</div>
            {selectedCustomer ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: '#6B6B6B', fontSize: 12, marginBottom: 12 }}>
                  <div>Total spent: {formatEuro(selectedCustomer.totalSpent)}</div>
                  <div>Orders: {formatNumber(selectedCustomer.ordersCount)}</div>
                  <div>Bought: {formatNumber(selectedCustomer.bottlesBought)}</div>
                  <div>Rated: {formatNumber(selectedCustomer.bottlesRated)}</div>
                  <div>% rated: {formatPercent(selectedCustomer.ratedPercentage)}</div>
                  <div>Unrated est.: {formatNumber(selectedCustomer.unratedBottlesRemaining)}</div>
                  <div>Stage: {selectedCustomer.funnelStage}</div>
                  <div>Repeat: {selectedCustomer.repeatCustomer ? 'Yes' : 'No'}</div>
                  <div>Smart Box ready: {selectedCustomer.smartBoxReady ? 'Yes' : 'No'}</div>
                  <div>Subscription ready: {selectedCustomer.subscriptionReady ? 'Yes' : 'No'}</div>
                </div>
                <p style={{ margin: '0 0 14px', color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>{selectedCustomer.nextAction}</p>
                <p style={{ margin: '0 0 14px', color: '#6B6B6B', fontSize: 12, lineHeight: 1.5 }}>
                  Email: {selectedCustomer.emailAngle}
                  <br />
                  Offer: {selectedCustomer.suggestedOffer}
                  <br />
                  Objection: {selectedCustomer.objectionToHandle}
                </p>
                <SectionTitle sub={selectedCustomer.wineColorsRated}>Rated Products</SectionTitle>
                <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                  <SortableDataTable columns={ratedWineColumns} rows={selectedCustomer.ratedWines as RatedWineRow[]} enableSearch={false} initialSortKey="ratingDate" />
                </div>
                <SectionTitle sub="Best-effort bought minus rated estimate">Purchased Products</SectionTitle>
                <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden' }}>
                  <SortableDataTable columns={productColumns} rows={selectedCustomer.purchasedProducts as ProductRow[]} enableSearch={false} initialSortKey="quantityBought" />
                </div>
              </>
            ) : null}
          </Card>
        </div>
      </PageSection>
    </>
  );
}

const selectStyle = {
  border: '1px solid #E8E6E1',
  borderRadius: 7,
  padding: '8px 10px',
  color: '#1A1A1A',
  background: '#FFFFFF',
  fontSize: 13,
};

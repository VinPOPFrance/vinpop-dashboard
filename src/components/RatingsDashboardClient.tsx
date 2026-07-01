'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { DonutChart } from '@/components/DonutChart';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { CustomerProductSummary, CustomerRatingsSummary, RatingsIntelligenceMetrics, RatedWineDetail } from '@/lib/db';

type RatingType = 'love' | 'like' | 'dislike';

type RatingTableRow = Record<string, unknown> & {
  wine: string;
  shopifyProductId: string;
  color: string;
  ratings: number;
  customers: number;
  love: number;
  like: number;
  dislike: number;
  loveRate: number | null;
  likeRate: number | null;
  dislikeRate: number | null;
  positiveRate: number | null;
  averageScore: number | null;
  action: string;
};

type CustomerTableRow = Record<string, unknown> & {
  customerId: string;
  email: string;
  totalSpent: number;
  orders: number;
  bottlesBought: number;
  bottlesRated: number;
  ratedRate: number | null;
  unrated: number;
  love: number;
  like: number;
  dislike: number;
  lastOrderDate: string | null;
  lastRatingDate: string | null;
  stage: string;
  nextAction: string;
};

type ProductRow = Record<string, unknown> & CustomerProductSummary;
type RatedWineRow = Record<string, unknown> & RatedWineDetail;

const wineColumns: SortableColumn<RatingTableRow>[] = [
  { key: 'wine', label: 'Wine', type: 'text', width: 220 },
  { key: 'ratings', label: 'Ratings', type: 'number' },
  { key: 'love', label: 'Love', type: 'number' },
  { key: 'like', label: 'Like', type: 'number' },
  { key: 'dislike', label: 'Dislike', type: 'number' },
  { key: 'loveRate', label: 'Love %', type: 'percent' },
  { key: 'dislikeRate', label: 'Dislike %', type: 'percent' },
  { key: 'action', label: 'Action', type: 'text' },
];

const customerColumns: SortableColumn<CustomerTableRow>[] = [
  { key: 'email', label: 'Customer email', type: 'text', width: 220 },
  { key: 'bottlesBought', label: 'Bottles bought', type: 'number' },
  { key: 'bottlesRated', label: 'Bottles rated', type: 'number' },
  { key: 'ratedRate', label: '% rated', type: 'percent' },
  { key: 'unrated', label: 'Unrated est.', type: 'number' },
  { key: 'stage', label: 'Stage', type: 'text' },
  { key: 'nextAction', label: 'Next action', type: 'text', width: 240 },
];

const productColumns: SortableColumn<ProductRow>[] = [
  { key: 'productName', label: 'Product / wine', type: 'text', width: 220 },
  { key: 'shopifyProductId', label: 'Shopify product ID', type: 'text' },
  { key: 'quantityBought', label: 'Qty bought', type: 'number' },
  { key: 'grossRevenue', label: 'Gross', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'netRevenue', label: 'Net', type: 'money' },
  { key: 'ratedCount', label: 'Rated count', type: 'number' },
  { key: 'unratedCount', label: 'Unrated est.', type: 'number' },
  { key: 'ratingStatus', label: 'Rating status', type: 'text' },
];

const ratedWineColumns: SortableColumn<RatedWineRow>[] = [
  { key: 'wineName', label: 'Wine / product', type: 'text', width: 220 },
  { key: 'shopifyProductId', label: 'Shopify product ID', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'ratingLabel', label: 'Rating', type: 'text' },
  { key: 'ratingDate', label: 'Rating date', type: 'date' },
];

function hasSelectedRating(row: { love: number; like: number; dislike: number }, selected: RatingType[]) {
  return (
    selected.length === 3 ||
    (selected.includes('love') && row.love > 0) ||
    (selected.includes('like') && row.like > 0) ||
    (selected.includes('dislike') && row.dislike > 0)
  );
}

export function RatingsDashboardClient({ metrics }: { metrics: RatingsIntelligenceMetrics }) {
  const [selectedRatingTypes, setSelectedRatingTypes] = useState<RatingType[]>(['love', 'like', 'dislike']);
  const [stageFilter, setStageFilter] = useState('All');
  const [colorFilter, setColorFilter] = useState('All');
  const [customerQuery, setCustomerQuery] = useState('');
  const [smartBoxFilter, setSmartBoxFilter] = useState('All');
  const [selectedProductId, setSelectedProductId] = useState(metrics.wines[0]?.shopifyProductId ?? '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(metrics.customers[0]?.customerId ?? '');
  const stages = ['All', ...Array.from(new Set(metrics.customers.map((customer) => customer.funnelStage)))];
  const colors = ['All', ...Array.from(new Set(metrics.wines.map((wine) => wine.color)))];
  const customersMatchingFilters = useMemo(
    () =>
      metrics.customers.filter((customer) => {
        if (stageFilter !== 'All' && customer.funnelStage !== stageFilter) return false;
        if (smartBoxFilter === 'Ready only' && !customer.smartBoxReady) return false;
        if (customerQuery.trim() && !customer.email.toLowerCase().includes(customerQuery.trim().toLowerCase())) return false;
        return true;
      }),
    [customerQuery, metrics.customers, smartBoxFilter, stageFilter],
  );
  const productIdsForMatchingCustomers = useMemo(
    () => new Set(customersMatchingFilters.flatMap((customer) => customer.ratedWines.map((wine) => wine.shopifyProductId))),
    [customersMatchingFilters],
  );

  const wineRows = useMemo<RatingTableRow[]>(
    () =>
      metrics.wines
        .map((wine) => ({
          wine: wine.wineName,
          shopifyProductId: wine.shopifyProductId || 'Unmapped',
          color: wine.color,
          ratings: wine.totalRatings,
          customers: wine.uniqueCustomers,
          love: wine.loveCount,
          like: wine.likeCount,
          dislike: wine.dislikeCount,
          loveRate: wine.loveRate,
          likeRate: wine.likeRate,
          dislikeRate: wine.dislikeRate,
          positiveRate: wine.positiveRate,
          averageScore: wine.averageRatingScore,
          action: wine.recommendationLabel,
        }))
        .filter((row) => hasSelectedRating(row, selectedRatingTypes))
        .filter((row) => colorFilter === 'All' || row.color === colorFilter)
        .filter((row) => stageFilter === 'All' && smartBoxFilter === 'All' && !customerQuery.trim() ? true : productIdsForMatchingCustomers.has(row.shopifyProductId)),
    [colorFilter, customerQuery, metrics.wines, productIdsForMatchingCustomers, selectedRatingTypes, smartBoxFilter, stageFilter],
  );
  const customerRows = useMemo<CustomerTableRow[]>(
    () =>
      customersMatchingFilters
        .map((customer) => ({
          customerId: customer.customerId,
          email: customer.email,
          totalSpent: customer.totalSpent,
          orders: customer.ordersCount,
          bottlesBought: customer.bottlesBought,
          bottlesRated: customer.bottlesRated,
          ratedRate: customer.ratedPercentage,
          unrated: customer.unratedBottlesRemaining,
          love: customer.loveCount,
          like: customer.likeCount,
          dislike: customer.dislikeCount,
          lastOrderDate: customer.lastOrderDate,
          lastRatingDate: customer.lastRatingDate,
          stage: customer.funnelStage,
          nextAction: customer.nextAction,
        }))
        .filter((row) => hasSelectedRating(row, selectedRatingTypes) || selectedRatingTypes.length === 3),
    [customersMatchingFilters, selectedRatingTypes],
  );
  const selectedWine = metrics.wines.find((wine) => wine.shopifyProductId === selectedProductId) ?? metrics.wines[0];
  const selectedCustomer = metrics.customers.find((customer) => customer.customerId === selectedCustomerId) ?? metrics.customers[0];
  const topLovedWines = [...wineRows].sort((a, b) => b.love - a.love).slice(0, 5);
  const weakSignalWines = [...wineRows].filter((row) => row.dislike > 0 || (row.dislikeRate ?? 0) >= 20).sort((a, b) => b.dislike - a.dislike).slice(0, 5);
  const customersNeedingRating = [...customerRows].filter((row) => row.unrated > 0).sort((a, b) => b.unrated - a.unrated).slice(0, 5);
  const smartBoxReadyCustomers = [...customerRows].filter((row) => row.stage.includes('Ready for Smart Box')).slice(0, 5);
  const selectedWineCustomers = selectedWine
    ? metrics.customers.filter((customer) =>
        customer.ratedWines.some((wine) => wine.shopifyProductId === selectedWine.shopifyProductId),
      )
    : [];
  const colorData = Array.from(
    metrics.wines.filter((wine) => colorFilter === 'All' || wine.color === colorFilter).reduce((map, wine) => {
      const selectedCount =
        (selectedRatingTypes.includes('love') ? wine.loveCount : 0) +
        (selectedRatingTypes.includes('like') ? wine.likeCount : 0) +
        (selectedRatingTypes.includes('dislike') ? wine.dislikeCount : 0);
      map.set(wine.color, (map.get(wine.color) ?? 0) + selectedCount);
      return map;
    }, new Map<string, number>()),
  ).map(([label, value]) => ({ label, value, color: label.toLowerCase().includes('red') ? '#722F37' : '#A67C00' }));
  const setAllRatings = () => setSelectedRatingTypes(['love', 'like', 'dislike']);
  const toggleType = (type: RatingType) => {
    setSelectedRatingTypes((current) => {
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      return next.length === 0 ? ['love', 'like', 'dislike'] : next;
    });
  };
  const activeAll = selectedRatingTypes.length === 3;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {[
          ['Total ratings', formatNumber(metrics.totalRatings)],
          ['Rated wines', formatNumber(metrics.uniqueRatedWines)],
          ['Users with ratings', formatNumber(metrics.usersWithRatings)],
          ['Users with 3+ ratings', formatNumber(metrics.usersWithThreePlusRatings)],
          ['Love %', formatPercent(metrics.loveRate)],
          ['Like %', formatPercent(metrics.likeRate)],
          ['Dislike %', formatPercent(metrics.dislikeRate)],
          ['Positive rating rate', formatPercent(metrics.positiveRatingRate)],
        ].map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>

      <PageSection>
        <SectionTitle sub={`${formatDate(metrics.firstRatingDate)} to ${formatDate(metrics.latestRatingDate)}`}>
          Rating Mix
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr 1fr', gap: 16 }}>
          <Card>
            <DonutChart
              centerLabel="Love Like Dislike"
              data={[
                { label: 'Love', value: selectedRatingTypes.includes('love') ? metrics.loveCount : 0, color: '#2D6A4F' },
                { label: 'Like', value: selectedRatingTypes.includes('like') ? metrics.likeCount : 0, color: '#A67C00' },
                { label: 'Dislike', value: selectedRatingTypes.includes('dislike') ? metrics.dislikeCount : 0, color: '#B45309' },
              ]}
            />
          </Card>
          <Card>
            <BarChart data={wineRows.slice(0, 10).map((wine) => ({ label: wine.wine, value: wine.ratings, color: '#722F37' }))} />
          </Card>
          <Card>
            <BarChart data={colorData} />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="The answers this page should give quickly">What Matters Now</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Card>
            <SectionTitle>Top Loved Wines</SectionTitle>
            {topLovedWines.map((wine) => (
              <p key={wine.shopifyProductId} style={{ margin: '0 0 8px', color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>
                {wine.wine}: {formatNumber(wine.love)} love ratings
              </p>
            ))}
          </Card>
          <Card>
            <SectionTitle>Weak Signals</SectionTitle>
            {(weakSignalWines.length ? weakSignalWines : wineRows.slice(0, 3)).map((wine) => (
              <p key={wine.shopifyProductId} style={{ margin: '0 0 8px', color: wine.dislike > 0 ? '#B45309' : '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
                {wine.wine}: {formatNumber(wine.dislike)} dislikes
              </p>
            ))}
          </Card>
          <Card>
            <SectionTitle>Needs Rating</SectionTitle>
            {customersNeedingRating.map((customer) => (
              <p key={customer.customerId} style={{ margin: '0 0 8px', color: '#B45309', fontSize: 13, fontWeight: 700 }}>
                {customer.email}: {formatNumber(customer.unrated)} unrated
              </p>
            ))}
          </Card>
          <Card>
            <SectionTitle>Ready for Smart Box</SectionTitle>
            {smartBoxReadyCustomers.length ? smartBoxReadyCustomers.map((customer) => (
              <p key={customer.customerId} style={{ margin: '0 0 8px', color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>
                {customer.email}
              </p>
            )) : <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No customer in this filtered view.</p>}
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Buttons filter charts, wine table, and customer table">Rating Filters</SectionTitle>
        <Card>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={setAllRatings} style={filterButtonStyle(activeAll)}>All</button>
            {[
              ['love', 'Love'],
              ['like', 'Like'],
              ['dislike', 'Dislike'],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => toggleType(key as RatingType)} style={filterButtonStyle(selectedRatingTypes.includes(key as RatingType) && !activeAll)}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} style={selectStyle}>
              {stages.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
            <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} style={selectStyle}>
              {colors.map((color) => <option key={color}>{color}</option>)}
            </select>
            <select value={smartBoxFilter} onChange={(event) => setSmartBoxFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Ready only</option>
            </select>
            <input
              value={customerQuery}
              onChange={(event) => setCustomerQuery(event.target.value)}
              placeholder="Search customer email..."
              style={{ ...selectStyle, minWidth: 220 }}
            />
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Click a row to inspect wine/product details">Wine/Product Ratings</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <SortableDataTable
              columns={wineColumns}
              rows={wineRows}
              searchPlaceholder="Search wine, product ID, color..."
              initialSortKey="ratings"
              getRowKey={(row) => row.shopifyProductId}
              selectedRowKey={selectedWine?.shopifyProductId}
              onRowClick={(row) => setSelectedProductId(row.shopifyProductId)}
              maxHeight={480}
            />
          </Card>
          <Card>
            <div style={{ color: '#1A1A1A', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {selectedWine?.wineName ?? 'No wine selected'}
            </div>
            {selectedWine ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#6B6B6B', fontSize: 13 }}>
                <div>Shopify product ID: {selectedWine.shopifyProductId || 'Unmapped'}</div>
                <div>Color: {selectedWine.color}</div>
                <div>Pairings: {selectedWine.pairingTags}</div>
                <div>Love: {formatNumber(selectedWine.loveCount)} ({formatPercent(selectedWine.loveRate)})</div>
                <div>Like: {formatNumber(selectedWine.likeCount)} ({formatPercent(selectedWine.likeRate)})</div>
                <div>Dislike: {formatNumber(selectedWine.dislikeCount)} ({formatPercent(selectedWine.dislikeRate)})</div>
                <div>Customers rated: {formatNumber(selectedWine.uniqueCustomers)}</div>
                <div style={{ color: '#2D6A4F', fontWeight: 700 }}>Signal: {selectedWine.recommendationLabel}</div>
                <div style={{ color: '#9B9B9B' }}>
                  Customers: {selectedWineCustomers.slice(0, 5).map((customer) => customer.email).join(', ') || 'None'}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Estimated bottles remaining = bought quantity minus rated wine count">Customer-Linked Ratings</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <SortableDataTable
              columns={customerColumns}
              rows={customerRows}
              searchPlaceholder="Search customer email or stage..."
              initialSortKey="totalSpent"
              getRowKey={(row) => row.customerId}
              selectedRowKey={selectedCustomer?.customerId}
              onRowClick={(row) => setSelectedCustomerId(row.customerId)}
              maxHeight={480}
            />
          </Card>
          <CustomerDetail customer={selectedCustomer} />
        </div>
      </PageSection>
    </>
  );
}

function filterButtonStyle(active: boolean): CSSProperties {
  return {
    border: active ? '1px solid #722F37' : '1px solid #E8E6E1',
    borderRadius: 999,
    padding: '8px 13px',
    background: active ? '#722F37' : '#FFFFFF',
    color: active ? '#FFFFFF' : '#6B6B6B',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
  };
}

function CustomerDetail({ customer }: { customer?: CustomerRatingsSummary }) {
  if (!customer) {
    return (
      <Card>
        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No customer selected.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ color: '#1A1A1A', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{customer.email}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: '#6B6B6B', fontSize: 12, marginBottom: 14 }}>
        <div>Total spent: {formatEuro(customer.totalSpent)}</div>
        <div>Orders: {formatNumber(customer.ordersCount)}</div>
        <div>Bought: {formatNumber(customer.bottlesBought)}</div>
        <div>Rated: {formatNumber(customer.bottlesRated)}</div>
        <div>% rated: {formatPercent(customer.ratedPercentage)}</div>
        <div>Unrated est.: {formatNumber(customer.unratedBottlesRemaining)}</div>
        <div>Stage: {customer.funnelStage}</div>
        <div>Repeat: {customer.repeatCustomer ? 'Yes' : 'No'}</div>
        <div>Smart Box ready: {customer.smartBoxReady ? 'Yes' : 'No'}</div>
        <div>Subscription ready: {customer.subscriptionReady ? 'Yes' : 'No'}</div>
      </div>
      <p style={{ margin: '0 0 12px', color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>{customer.nextAction}</p>
      <p style={{ margin: '0 0 12px', color: '#6B6B6B', fontSize: 12, lineHeight: 1.5 }}>
        Email: {customer.emailAngle}
        <br />
        Offer: {customer.suggestedOffer}
        <br />
        Objection: {customer.objectionToHandle}
      </p>
      <SectionTitle sub={customer.wineColorsRated}>Rated Wines</SectionTitle>
      <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <SortableDataTable columns={ratedWineColumns} rows={customer.ratedWines as RatedWineRow[]} enableSearch={false} initialSortKey="ratingDate" maxHeight={260} />
      </div>
      <SectionTitle sub="Purchased product context">Products Bought</SectionTitle>
      <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden' }}>
        <SortableDataTable columns={productColumns} rows={customer.purchasedProducts as ProductRow[]} enableSearch={false} initialSortKey="quantityBought" maxHeight={260} />
      </div>
    </Card>
  );
}

const selectStyle: CSSProperties = {
  border: '1px solid #E8E6E1',
  borderRadius: 7,
  padding: '8px 10px',
  color: '#1A1A1A',
  background: '#FFFFFF',
  fontSize: 13,
};

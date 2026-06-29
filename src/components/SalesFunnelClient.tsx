'use client';

import { useMemo, useState } from 'react';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { DonutChart } from '@/components/DonutChart';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { CUSTOMER_STAGE_DEFINITIONS, type CustomerStageDefinition } from '@/lib/customerStages';
import { formatNumber, formatPercent } from '@/lib/format';
import type { CustomerRatingsSummary } from '@/lib/db';

type FunnelCustomerRow = Record<string, unknown> & {
  email: string;
  stage: string;
  totalSpent: number;
  ordersCount: number;
  bottlesBought: number;
  bottlesRated: number;
  ratedPercentage: number | null;
  lastOrderDate: string | null;
  lastRatingDate: string | null;
  repeatBuyer: string;
  smartBoxReady: string;
  nextAction: string;
};

const columns: SortableColumn<FunnelCustomerRow>[] = [
  { key: 'email', label: 'Customer email', type: 'text', width: 240 },
  { key: 'stage', label: 'Stage', type: 'text', width: 180 },
  { key: 'totalSpent', label: 'Total spent', type: 'money' },
  { key: 'ordersCount', label: 'Orders', type: 'number' },
  { key: 'bottlesBought', label: 'Bottles bought', type: 'number' },
  { key: 'bottlesRated', label: 'Bottles rated', type: 'number' },
  { key: 'ratedPercentage', label: '% rated', type: 'percent' },
  { key: 'lastOrderDate', label: 'Last order', type: 'date' },
  { key: 'lastRatingDate', label: 'Last rating', type: 'date' },
  { key: 'repeatBuyer', label: 'Repeat buyer', type: 'text' },
  { key: 'smartBoxReady', label: 'Ready for Smart Box', type: 'text' },
  { key: 'nextAction', label: 'Next action', type: 'text', width: 260 },
];

function healthColor(health: string) {
  if (health === 'good') return '#2D6A4F';
  if (health === 'critical') return '#C0392B';
  if (health === 'warning') return '#B45309';
  return '#9B9B9B';
}

function stageSlug(stage: string) {
  return stage.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function SalesFunnelClient({ customers }: { customers: CustomerRatingsSummary[] }) {
  const initialStage = () => {
    if (typeof window === 'undefined') return 'All';
    const stageParam = new URLSearchParams(window.location.search).get('stage');
    if (!stageParam) return 'All';
    const match = CUSTOMER_STAGE_DEFINITIONS.find((stage) => stageSlug(stage.name) === stageParam || stage.name === stageParam);
    return match?.name ?? 'All';
  };
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [ratingStatusFilter, setRatingStatusFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [repeatFilter, setRepeatFilter] = useState('All');
  const [startupFilter, setStartupFilter] = useState('All');
  const [smartBoxFilter, setSmartBoxFilter] = useState('All');
  const [selectedStageName, setSelectedStageName] = useState(initialStage);

  const stageCounts = useMemo(
    () =>
      CUSTOMER_STAGE_DEFINITIONS.map((stage) => ({
        ...stage,
        count: customers.filter((customer) => customer.funnelStage === stage.name).length,
      })),
    [customers],
  );
  const totalKnown = Math.max(customers.length, 1);
  const visibleStageCounts = stageCounts.filter((stage) => stage.count > 0 || stage.confidence === 'unavailable');
  const selectedStage = CUSTOMER_STAGE_DEFINITIONS.find((stage) => stage.name === selectedStageName) ?? visibleStageCounts[0];
  const filteredCustomers = customers.filter((customer) => {
    if (stageFilter !== 'All' && customer.funnelStage !== stageFilter) return false;
    if (ratingStatusFilter === 'Has ratings' && customer.bottlesRated === 0) return false;
    if (ratingStatusFilter === 'Needs ratings' && customer.unratedBottlesRemaining <= 0) return false;
    if (orderStatusFilter === 'Has orders' && customer.ordersCount === 0) return false;
    if (orderStatusFilter === 'No orders' && customer.ordersCount > 0) return false;
    if (repeatFilter === 'Repeat only' && !customer.repeatCustomer) return false;
    if (startupFilter === 'Startup Pack only' && !customer.startupPackBuyer) return false;
    if (smartBoxFilter === 'Ready only' && !customer.smartBoxReady) return false;
    return true;
  });
  const rows = filteredCustomers.map((customer) => ({
    email: customer.email,
    stage: customer.funnelStage,
    totalSpent: customer.totalSpent,
    ordersCount: customer.ordersCount,
    bottlesBought: customer.bottlesBought,
    bottlesRated: customer.bottlesRated,
    ratedPercentage: customer.ratedPercentage,
    lastOrderDate: customer.lastOrderDate,
    lastRatingDate: customer.lastRatingDate,
    repeatBuyer: customer.repeatCustomer ? 'Yes' : 'No',
    smartBoxReady: customer.smartBoxReady ? 'Yes' : 'No',
    nextAction: customer.nextAction,
  }));
  const biggestOpportunity = [...stageCounts].sort((a, b) => b.count - a.count).find((stage) => stage.health !== 'good' && stage.count > 0);
  const highestDropoff = stageCounts.reduce<{ label: string; dropoff: number; rate: number | null } | null>((best, stage, index) => {
    if (index === 0) return best;
    const previous = stageCounts[index - 1];
    if (previous.count === 0) return best;
    const dropoff = Math.max(previous.count - stage.count, 0);
    const dropoffRate = (dropoff / previous.count) * 100;
    if (!best || dropoff > best.dropoff) return { label: `${previous.name} → ${stage.name}`, dropoff, rate: dropoffRate };
    return best;
  }, null);

  return (
    <>
      <PageSection>
        <SectionTitle sub="Early visitor/session stages are gray until tracking exists">Sales Funnel Visual</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
            Visitor/session tracking is not yet implemented, so early funnel stages cannot be measured precisely.
          </p>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 0.7fr)', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleStageCounts.map((stage, index) => {
                const previous = index > 0 ? visibleStageCounts[index - 1] : null;
                const conversion = previous && previous.count > 0 ? (stage.count / previous.count) * 100 : null;
                return (
                  <button
                    key={stage.name}
                    type="button"
                    onClick={() => {
                      setStageFilter(stage.name);
                      setSelectedStageName(stage.name);
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(170px, 240px) 1fr auto',
                      alignItems: 'center',
                      gap: 12,
                      border: stageFilter === stage.name ? '1px solid #722F37' : '1px solid #E8E6E1',
                      background: stageFilter === stage.name ? '#FFF6F7' : '#FFFFFF',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: '#1A1A1A', fontWeight: 700, fontSize: 13 }}>{stage.name}</span>
                    <span style={{ height: 10, background: '#F5F4F0', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.max((stage.count / totalKnown) * 100, stage.count > 0 ? 2 : 0)}%`, background: healthColor(stage.health) }} />
                    </span>
                    <span style={{ color: healthColor(stage.health), fontWeight: 700, fontSize: 12, textAlign: 'right' }}>
                      {formatNumber(stage.count)}
                      <br />
                      <span style={{ color: '#9B9B9B', fontWeight: 500 }}>{conversion === null ? 'n/a' : formatPercent(conversion)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card>
            <SectionTitle sub="Stage distribution">Known Customers</SectionTitle>
            <DonutChart data={stageCounts.filter((stage) => stage.count > 0).map((stage) => ({ label: stage.name, value: stage.count, color: healthColor(stage.health) }))} />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="What deserves attention first">Funnel Snapshot</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Card><p style={{ margin: 0, color: '#1A1A1A', fontWeight: 700 }}>Known customers/leads: {formatNumber(customers.length)}</p></Card>
          <Card><p style={{ margin: 0, color: '#B45309', fontWeight: 700 }}>Highest drop-off: {highestDropoff ? `${highestDropoff.label} (${formatNumber(highestDropoff.dropoff)}, ${formatPercent(highestDropoff.rate)})` : 'Unavailable'}</p></Card>
          <Card><p style={{ margin: 0, color: '#2D6A4F', fontWeight: 700 }}>Biggest opportunity: {biggestOpportunity?.name ?? 'No urgent stage detected'}</p></Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Recommended action, offer, objection, and confidence">Stage Cards</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {visibleStageCounts.map((stage) => <StageCard key={stage.name} stage={stage} totalKnown={totalKnown} />)}
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Filters update the table below">Customer Segment Filters</SectionTitle>
        <Card>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={stageFilter} onChange={(event) => { setStageFilter(event.target.value); setSelectedStageName(event.target.value); }} style={selectStyle}>
              <option>All</option>
              {CUSTOMER_STAGE_DEFINITIONS.map((stage) => <option key={stage.name}>{stage.name}</option>)}
            </select>
            <select value={ratingStatusFilter} onChange={(event) => setRatingStatusFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Has ratings</option>
              <option>Needs ratings</option>
            </select>
            <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Has orders</option>
              <option>No orders</option>
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
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub={selectedStage?.explanation}>Selected Stage Detail</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ color: healthColor(selectedStage?.health ?? 'missing'), fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            {(selectedStage?.health ?? 'missing').toUpperCase()} · confidence {selectedStage?.confidence ?? 'low'}
          </div>
          <p style={{ margin: '0 0 6px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>{selectedStage?.recommendedAction}</p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            Email: {selectedStage?.emailAngle} · Meta/Instagram: {selectedStage?.socialAngle} · Offer: {selectedStage?.offer} · Objection: {selectedStage?.objection}
          </p>
        </Card>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SortableDataTable
            columns={columns}
            rows={rows}
            initialSortKey="totalSpent"
            searchPlaceholder="Search customer email, stage, action..."
          />
        </Card>
      </PageSection>
    </>
  );
}

function StageCard({ stage, totalKnown }: { stage: CustomerStageDefinition & { count: number }; totalKnown: number }) {
  return (
    <Card>
      <div style={{ color: healthColor(stage.health), fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{stage.health.toUpperCase()}</div>
      <div style={{ color: '#1A1A1A', fontSize: 15, fontWeight: 700 }}>{stage.name}</div>
      <p style={{ color: '#6B6B6B', margin: '6px 0', fontSize: 13 }}>
        {formatNumber(stage.count)} customers · {formatPercent((stage.count / totalKnown) * 100)}
      </p>
      <p style={{ color: '#2D6A4F', margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>{stage.recommendedAction}</p>
      <p style={{ color: '#6B6B6B', margin: 0, fontSize: 12, lineHeight: 1.5 }}>
        Email: {stage.emailAngle}
        <br />
        Social: {stage.socialAngle}
        <br />
        Objection: {stage.objection}
      </p>
    </Card>
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

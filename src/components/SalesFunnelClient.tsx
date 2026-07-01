'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { CUSTOMER_STAGE_DEFINITIONS, type CustomerStageDefinition } from '@/lib/customerStages';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { CustomerProductSummary, CustomerRatingsSummary, RatedWineDetail } from '@/lib/db';

type FunnelCustomerRow = Record<string, unknown> & {
  customerId: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
  bottlesBought: number;
  bottlesRated: number;
  ratedPercentage: number | null;
  unratedBottlesRemaining: number;
  lastOrderDate: string | null;
  lastRatingDate: string | null;
  nextAction: string;
};

type ProductRow = Record<string, unknown> & CustomerProductSummary;
type RatedWineRow = Record<string, unknown> & RatedWineDetail;
type StageWithCount = CustomerStageDefinition & { count: number };

const customerColumns: SortableColumn<FunnelCustomerRow>[] = [
  { key: 'email', label: 'Email', type: 'text', width: 240 },
  { key: 'totalSpent', label: 'Total spent', type: 'money' },
  { key: 'ordersCount', label: 'Orders', type: 'number' },
  { key: 'bottlesBought', label: 'Bought', type: 'number' },
  { key: 'bottlesRated', label: 'Rated', type: 'number' },
  { key: 'ratedPercentage', label: '% rated', type: 'percent' },
  { key: 'unratedBottlesRemaining', label: 'Unrated', type: 'number' },
  { key: 'lastOrderDate', label: 'Last order', type: 'date' },
  { key: 'lastRatingDate', label: 'Last rating', type: 'date' },
  { key: 'nextAction', label: 'Next action', type: 'text', width: 260 },
];

const productColumns: SortableColumn<ProductRow>[] = [
  { key: 'productName', label: 'Product / wine', type: 'text', width: 220 },
  { key: 'quantityBought', label: 'Bought', type: 'number' },
  { key: 'netRevenue', label: 'Net revenue', type: 'money' },
  { key: 'ratedCount', label: 'Rated', type: 'number' },
  { key: 'unratedCount', label: 'Unrated', type: 'number' },
  { key: 'ratingStatus', label: 'Status', type: 'text' },
];

const ratedWineColumns: SortableColumn<RatedWineRow>[] = [
  { key: 'wineName', label: 'Wine / product', type: 'text', width: 220 },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'ratingLabel', label: 'Rating', type: 'text' },
  { key: 'ratingDate', label: 'Rating date', type: 'date' },
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

function stageFromParam(stageParam: string | null) {
  if (!stageParam) return 'All';
  const decoded = decodeURIComponent(stageParam).replace(/\+/g, ' ');
  const normalized = stageSlug(decoded);
  const match = CUSTOMER_STAGE_DEFINITIONS.find((stage) => stageSlug(stage.name) === normalized || stage.name.toLowerCase() === decoded.toLowerCase());
  return match?.name ?? 'All';
}

function StageButton({
  stage,
  totalKnown,
  isSelected,
  onClick,
}: {
  stage: StageWithCount;
  totalKnown: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: isSelected ? '1px solid #722F37' : '1px solid #E8E6E1',
        background: isSelected ? '#FFF6F7' : '#FFFFFF',
        borderRadius: 8,
        padding: 10,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 800 }}>{stage.name}</span>
        <span style={{ color: healthColor(stage.health), fontSize: 12, fontWeight: 800 }}>{formatNumber(stage.count)}</span>
      </div>
      <div style={{ height: 8, background: '#F5F4F0', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
        <span style={{ display: 'block', height: '100%', width: `${Math.max((stage.count / totalKnown) * 100, stage.count > 0 ? 2 : 0)}%`, background: healthColor(stage.health) }} />
      </div>
      <div style={{ color: '#6B6B6B', fontSize: 11, marginTop: 7, lineHeight: 1.35 }}>
        {formatPercent((stage.count / totalKnown) * 100)} · {stage.recommendedAction}
      </div>
    </button>
  );
}

export function SalesFunnelClient({ customers }: { customers: CustomerRatingsSummary[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialStage = () => {
    if (typeof window === 'undefined') return 'All';
    return stageFromParam(new URLSearchParams(window.location.search).get('stage'));
  };
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ratingStatusFilter, setRatingStatusFilter] = useState('All');
  const [repeatFilter, setRepeatFilter] = useState('All');

  const stageCounts = useMemo(
    () =>
      CUSTOMER_STAGE_DEFINITIONS.map((stage) => ({
        ...stage,
        count: customers.filter((customer) => customer.funnelStage === stage.name).length,
      })),
    [customers],
  );
  const visibleStageCounts = stageCounts.filter((stage) => stage.count > 0 || stage.confidence === 'unavailable');
  const totalKnown = Math.max(customers.length, 1);
  const selectedStage = CUSTOMER_STAGE_DEFINITIONS.find((stage) => stage.name === stageFilter) ?? null;
  const filteredCustomers = customers.filter((customer) => {
    if (stageFilter !== 'All' && customer.funnelStage !== stageFilter) return false;
    if (ratingStatusFilter === 'Needs ratings' && customer.unratedBottlesRemaining <= 0) return false;
    if (ratingStatusFilter === 'Has ratings' && customer.bottlesRated === 0) return false;
    if (repeatFilter === 'Repeat only' && !customer.repeatCustomer) return false;
    return true;
  });
  const selectedCustomer = filteredCustomers.find((customer) => customer.customerId === selectedCustomerId) ?? filteredCustomers[0] ?? null;
  const rows: FunnelCustomerRow[] = filteredCustomers.map((customer) => ({
    customerId: customer.customerId,
    email: customer.email,
    totalSpent: customer.totalSpent,
    ordersCount: customer.ordersCount,
    bottlesBought: customer.bottlesBought,
    bottlesRated: customer.bottlesRated,
    ratedPercentage: customer.ratedPercentage,
    unratedBottlesRemaining: customer.unratedBottlesRemaining,
    lastOrderDate: customer.lastOrderDate,
    lastRatingDate: customer.lastRatingDate,
    nextAction: customer.nextAction,
  }));
  const applyStageFilter = (stageName: string) => {
    setStageFilter(stageName);
    setSelectedCustomerId('');
    router.replace(stageName === 'All' ? pathname : `${pathname}?stage=${encodeURIComponent(stageName)}`, { scroll: false });
  };

  return (
    <>
      <PageSection>
        <SectionTitle sub="Click a stage to see customers and the next action.">Segment Action Screen</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <Card>
            <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Funnel stages</div>
            <button
              type="button"
              onClick={() => applyStageFilter('All')}
              style={{
                width: '100%',
                border: stageFilter === 'All' ? '1px solid #722F37' : '1px solid #E8E6E1',
                background: stageFilter === 'All' ? '#FFF6F7' : '#FFFFFF',
                borderRadius: 8,
                padding: 10,
                cursor: 'pointer',
                textAlign: 'left',
                color: '#1A1A1A',
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              All known customers · {formatNumber(customers.length)}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleStageCounts.map((stage) => (
                <StageButton
                  key={stage.name}
                  stage={stage}
                  totalKnown={totalKnown}
                  isSelected={stageFilter === stage.name}
                  onClick={() => applyStageFilter(stage.name)}
                />
              ))}
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 14, borderBottom: '1px solid #E8E6E1', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>
                  {stageFilter === 'All' ? 'All customers' : stageFilter}
                </div>
                <div style={{ color: '#6B6B6B', fontSize: 12 }}>{formatNumber(filteredCustomers.length)} customers in this segment</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={ratingStatusFilter} onChange={(event) => setRatingStatusFilter(event.target.value)} style={selectStyle}>
                  <option>All</option>
                  <option>Needs ratings</option>
                  <option>Has ratings</option>
                </select>
                <select value={repeatFilter} onChange={(event) => setRepeatFilter(event.target.value)} style={selectStyle}>
                  <option>All</option>
                  <option>Repeat only</option>
                </select>
              </div>
            </div>
            {rows.length ? (
              <SortableDataTable
                columns={customerColumns}
                rows={rows}
                initialSortKey="totalSpent"
                searchPlaceholder="Search customer email or action..."
                getRowKey={(row) => row.customerId}
                selectedRowKey={selectedCustomer?.customerId}
                onRowClick={(row) => setSelectedCustomerId(row.customerId)}
              />
            ) : (
              <div style={{ padding: 18, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
                No customers match this stage/filter yet. Check tracking readiness if this should not be empty.
              </div>
            )}
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Directly tied to the selected stage">Selected Stage Action</SectionTitle>
        <Card>
          {selectedStage ? (
            <>
              <div style={{ color: healthColor(selectedStage.health), fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                {selectedStage.health} · confidence {selectedStage.confidence}
              </div>
              <div style={{ color: '#1A1A1A', fontSize: 16, fontWeight: 800, marginTop: 6 }}>
                {selectedStage.name} · {formatNumber(filteredCustomers.length)} customers
              </div>
              <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{selectedStage.explanation}</p>
              <p style={{ margin: '10px 0 0', color: '#2D6A4F', fontSize: 13, fontWeight: 800 }}>Next action: {selectedStage.recommendedAction}</p>
              <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
                Suggested email: {selectedStage.emailAngle}
                <br />
                Offer: {selectedStage.offer}
                <br />
                Objection to handle: {selectedStage.objection}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
              Select a stage to see the action. Start with segments that need rating reminders or are ready for Smart Box.
            </p>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Appears close to the selected customer table">Selected Customer Detail</SectionTitle>
        <Card>
          {selectedCustomer ? (
            <>
              <div style={{ color: '#1A1A1A', fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{selectedCustomer.email}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, color: '#6B6B6B', fontSize: 12, marginBottom: 14 }}>
                <div>Stage: {selectedCustomer.funnelStage}</div>
                <div>Total spent: {formatEuro(selectedCustomer.totalSpent)}</div>
                <div>Orders: {formatNumber(selectedCustomer.ordersCount)}</div>
                <div>Bought: {formatNumber(selectedCustomer.bottlesBought)}</div>
                <div>Rated: {formatNumber(selectedCustomer.bottlesRated)}</div>
                <div>% rated: {formatPercent(selectedCustomer.ratedPercentage)}</div>
                <div>Unrated: {formatNumber(selectedCustomer.unratedBottlesRemaining)}</div>
                <div>Love / Like / Dislike: {formatNumber(selectedCustomer.loveCount)} / {formatNumber(selectedCustomer.likeCount)} / {formatNumber(selectedCustomer.dislikeCount)}</div>
              </div>
              <p style={{ margin: '0 0 14px', color: '#2D6A4F', fontSize: 13, fontWeight: 800 }}>{selectedCustomer.nextAction}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <div>
                  <SectionTitle sub={selectedCustomer.wineColorsRated}>Wines Rated</SectionTitle>
                  <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden' }}>
                    <SortableDataTable columns={ratedWineColumns} rows={selectedCustomer.ratedWines as RatedWineRow[]} enableSearch={false} initialSortKey="ratingDate" />
                  </div>
                </div>
                <div>
                  <SectionTitle sub="Best-effort bought minus rated estimate">Products Bought</SectionTitle>
                  <div style={{ border: '1px solid #E8E6E1', borderRadius: 8, overflow: 'hidden' }}>
                    <SortableDataTable columns={productColumns} rows={selectedCustomer.purchasedProducts as ProductRow[]} enableSearch={false} initialSortKey="quantityBought" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>Click a customer in the selected stage table to inspect detail.</p>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <details>
          <summary style={{ cursor: 'pointer', color: '#722F37', fontSize: 13, fontWeight: 800 }}>Stage playbook</summary>
          <Card style={{ marginTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {visibleStageCounts.map((stage) => (
                <div key={stage.name} style={{ border: '1px solid #E8E6E1', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 800 }}>{stage.name}</div>
                  <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: 12, lineHeight: 1.45 }}>
                    Email: {stage.emailAngle}
                    <br />
                    Angle: {stage.socialAngle}
                    <br />
                    Objection: {stage.objection}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </details>
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

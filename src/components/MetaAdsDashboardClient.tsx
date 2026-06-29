'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { MetaAdsPerformanceMetrics, MetaPerformanceRow } from '@/lib/db';

type MetaRow = MetaPerformanceRow & Record<string, unknown>;

const columns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Name', type: 'text', width: 220 },
  { key: 'parentName', label: 'Parent', type: 'text', width: 180 },
  { key: 'campaignName', label: 'Campaign', type: 'text', width: 180 },
  { key: 'firstDate', label: 'First date', type: 'date' },
  { key: 'latestDate', label: 'Latest date', type: 'date' },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'cpc', label: 'CPC', type: 'money' },
  { key: 'cpm', label: 'CPM', type: 'money' },
  { key: 'purchases', label: 'Purchases', type: 'number' },
  { key: 'cpa', label: 'CPA', type: 'money' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'performanceLabel', label: 'Label', type: 'text' },
  { key: 'recommendedAction', label: 'Recommended action', type: 'text', width: 240 },
];

function filteredByDate(rows: MetaPerformanceRow[], from: string, to: string) {
  return rows.filter((row) => {
    const rowStart = row.firstDate ? row.firstDate.slice(0, 10) : '';
    const rowEnd = row.latestDate ? row.latestDate.slice(0, 10) : '';
    if (from && rowEnd && rowEnd < from) return false;
    if (to && rowStart && rowStart > to) return false;
    return true;
  });
}

function MetaTable({
  title,
  rows,
  onRowClick,
  selectedRowKey,
}: {
  title: string;
  rows: MetaPerformanceRow[];
  onRowClick?: (row: MetaRow) => void;
  selectedRowKey?: string;
}) {
  return (
    <PageSection>
      <SectionTitle>{title}</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <SortableDataTable
          columns={columns}
          rows={rows as MetaRow[]}
          initialSortKey="spend"
          searchPlaceholder={`Search ${title.toLowerCase()}...`}
          getRowKey={(row) => `${row.name}.${row.parentName}.${row.campaignName}`}
          selectedRowKey={selectedRowKey}
          onRowClick={onRowClick}
        />
      </Card>
    </PageSection>
  );
}

export function MetaAdsDashboardClient({ metrics }: { metrics: MetaAdsPerformanceMetrics }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [adSetFilter, setAdSetFilter] = useState('');
  const campaigns = useMemo(() => filteredByDate(metrics.campaigns, from, to), [from, metrics.campaigns, to]);
  const adSets = useMemo(
    () => filteredByDate(metrics.adSets, from, to).filter((row) => !campaignFilter || row.parentName === campaignFilter),
    [campaignFilter, from, metrics.adSets, to],
  );
  const ads = useMemo(
    () =>
      filteredByDate(metrics.ads, from, to)
        .filter((row) => !adSetFilter || row.parentName === adSetFilter)
        .filter((row) => !campaignFilter || row.campaignName === campaignFilter),
    [adSetFilter, campaignFilter, from, metrics.ads, to],
  );
  const chartData = campaigns.slice(0, 8).map((row) => ({ label: row.name, value: row.spend, color: '#722F37' }));
  const clickData = campaigns.slice(0, 8).map((row) => ({ label: row.name, value: row.clicks, color: '#2D6A4F' }));
  const ctrData = [...campaigns]
    .sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))
    .slice(0, 8)
    .map((row) => ({ label: row.name, value: row.ctr ?? 0, color: '#A67C00' }));
  const topSpend = [...campaigns].sort((a, b) => b.spend - a.spend)[0];
  const topCtr = [...campaigns].filter((row) => row.clicks > 0).sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))[0];
  const bestCpc = [...campaigns].filter((row) => row.clicks > 0 && row.cpc !== null).sort((a, b) => (a.cpc ?? 0) - (b.cpc ?? 0))[0];
  const weakest = [...campaigns].filter((row) => row.spend > 0).sort((a, b) => {
    const aScore = (a.ctr ?? 0) - (a.cpc ?? 0);
    const bScore = (b.ctr ?? 0) - (b.cpc ?? 0);
    return aScore - bScore;
  })[0];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ color: '#6B6B6B', fontSize: 12 }}>
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={{ display: 'block', marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }} />
          </label>
          <label style={{ color: '#6B6B6B', fontSize: 12 }}>
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} style={{ display: 'block', marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }} />
          </label>
          <button type="button" onClick={() => { setFrom(''); setTo(''); setCampaignFilter(''); setAdSetFilter(''); }} style={{ padding: '9px 12px', borderRadius: 7, border: '1px solid #E8E6E1', background: '#FFFFFF', color: '#722F37', cursor: 'pointer' }}>
            Clear filters
          </button>
          <div style={{ color: '#6B6B6B', fontSize: 12 }}>
            Date range: {formatDate(metrics.firstDate)} to {formatDate(metrics.latestDate)}
          </div>
        </div>
      </Card>

      <PageSection>
        <SectionTitle sub="Click a campaign bar to filter ad sets and ads">Campaign Visuals</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <Card>
            <SectionTitle>Spend</SectionTitle>
            <BarChart data={chartData} valueFormatter={formatEuro} onBarClick={(label) => { setCampaignFilter(label); setAdSetFilter(''); }} />
          </Card>
          <Card>
            <SectionTitle>Clicks</SectionTitle>
            <BarChart data={clickData} onBarClick={(label) => { setCampaignFilter(label); setAdSetFilter(''); }} />
          </Card>
          <Card>
            <SectionTitle>CTR</SectionTitle>
            <BarChart data={ctrData} valueFormatter={(value) => formatPercent(value)} onBarClick={(label) => { setCampaignFilter(label); setAdSetFilter(''); }} />
          </Card>
        </div>
        <Card style={{ marginTop: 12 }}>
          {campaignFilter ? (
            <p style={{ margin: '12px 0 0', color: '#722F37', fontSize: 13, fontWeight: 700 }}>
              Filtering ad sets by campaign: {campaignFilter}
            </p>
          ) : null}
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Plain-language campaign diagnostics">Best / Worst Performers</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Card><p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>Top spend: {topSpend?.name ?? 'Unavailable'} ({formatEuro(topSpend?.spend ?? null)})</p></Card>
          <Card><p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>Top CTR: {topCtr?.name ?? 'Unavailable'} ({formatPercent(topCtr?.ctr ?? null)})</p></Card>
          <Card><p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 700 }}>Best CPC: {bestCpc?.name ?? 'Unavailable'} ({formatEuro(bestCpc?.cpc ?? null)})</p></Card>
          <Card><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>Needs review: {weakest?.name ?? 'Unavailable'}</p></Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Plain business read">Simple Interpretation</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          <Card><p style={{ margin: 0, color: (metrics.ctr ?? 0) >= 1 ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>CTR: {formatPercent(metrics.ctr)} from {formatNumber(metrics.clicks)} clicks.</p></Card>
          <Card><p style={{ margin: 0, color: (metrics.cpc ?? 99) <= 1.5 ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>CPC: {formatEuro(metrics.cpc)}.</p></Card>
          <Card><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>CAC unavailable until Meta clicks are joined to Shopify orders.</p></Card>
          <Card><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>ROAS unavailable until revenue attribution is available.</p></Card>
        </div>
      </PageSection>

      <MetaTable
        title="Campaign Performance"
        rows={campaigns}
        selectedRowKey={campaignFilter ? `${campaignFilter}..${campaignFilter}` : undefined}
        onRowClick={(row) => {
          setCampaignFilter(String(row.name));
          setAdSetFilter('');
        }}
      />
      <MetaTable
        title="Ad Set Performance"
        rows={adSets}
        selectedRowKey={adSetFilter ? `${adSetFilter}.${campaignFilter}.${campaignFilter}` : undefined}
        onRowClick={(row) => setAdSetFilter(String(row.name))}
      />
      <MetaTable title="Ad Performance" rows={ads} />
    </>
  );
}

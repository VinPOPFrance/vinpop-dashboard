'use client';

import { useState } from 'react';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { LineChart } from '@/components/dashboard/LineChart';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { MetaAdsPerformanceMetrics, MetaDailyPerformancePoint, MetaPerformanceRow } from '@/lib/db';

const MIN_SPEND = 15;

type MetaRow = MetaPerformanceRow & Record<string, unknown>;
type DailyRow = MetaDailyPerformancePoint & Record<string, unknown>;

const rankingColumns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Ad', type: 'text', width: 220 },
  { key: 'campaignName', label: 'Campaign', type: 'text', width: 180 },
  { key: 'parentName', label: 'Ad set', type: 'text', width: 180 },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'cpc', label: 'CPC', type: 'money' },
  { key: 'cpm', label: 'CPM', type: 'money' },
  { key: 'hookRate', label: 'Hook', type: 'percent' },
  { key: 'purchases', label: 'Meta purchases', type: 'number' },
  { key: 'cpa', label: 'Meta CPA', type: 'money' },
  { key: 'roas', label: 'Meta ROAS', type: 'number' },
  { key: 'recommendedAction', label: 'Action', type: 'text', width: 260 },
];

const drillColumns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Name', type: 'text', width: 240 },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'cpc', label: 'CPC', type: 'money' },
  { key: 'cpm', label: 'CPM', type: 'money' },
  { key: 'performanceLabel', label: 'Label', type: 'text' },
  { key: 'recommendedAction', label: 'Action', type: 'text', width: 240 },
];

const dailyColumns: SortableColumn<DailyRow>[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'cpc', label: 'CPC', type: 'money' },
  { key: 'cpm', label: 'CPM', type: 'money' },
  { key: 'purchases', label: 'Meta purchases', type: 'number' },
  { key: 'cpa', label: 'Meta CPA', type: 'money' },
  { key: 'roas', label: 'Meta ROAS', type: 'number' },
];

function metricTone(status: string): 'default' | 'good' | 'warning' {
  return status === 'Good' ? 'good' : status === 'Weak' ? 'warning' : 'default';
}

function sumRows(rows: MetaPerformanceRow[]) {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const purchases = rows.reduce((sum, row) => sum + (row.purchases ?? 0), 0);
  const purchaseValue = rows.reduce((sum, row) => sum + (row.purchaseValue ?? 0), 0);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions ? (clicks / impressions) * 100 : null,
    cpc: clicks ? spend / clicks : null,
    cpm: impressions ? (spend / impressions) * 1000 : null,
    purchases: purchases > 0 ? purchases : null,
    cpa: purchases > 0 ? spend / purchases : null,
    roas: purchaseValue > 0 && spend > 0 ? purchaseValue / spend : null,
  };
}

function aggregateDaily(rows: MetaDailyPerformancePoint[]) {
  const byDate = new Map<string, { spend: number; impressions: number; clicks: number; purchases: number; purchaseValue: number }>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0 };
    current.spend += row.spend;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.purchases += row.purchases ?? 0;
    if (row.roas !== null && row.spend > 0) current.purchaseValue += row.roas * row.spend;
    byDate.set(row.date, current);
  }

  return Array.from(byDate.entries()).map(([date, row]) => ({
    date,
    campaignId: '',
    adSetId: '',
    adId: '',
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.impressions ? (row.clicks / row.impressions) * 100 : null,
    cpc: row.clicks ? row.spend / row.clicks : null,
    cpm: row.impressions ? (row.spend / row.impressions) * 1000 : null,
    purchases: row.purchases > 0 ? row.purchases : null,
    cpa: row.purchases > 0 ? row.spend / row.purchases : null,
    roas: row.purchaseValue > 0 && row.spend > 0 ? row.purchaseValue / row.spend : null,
  }));
}

function trafficQuality(ctr: number | null, cpc: number | null) {
  if ((ctr ?? 0) >= 2 && (cpc ?? 99) <= 0.5) return 'Good';
  if ((ctr ?? 0) >= 1 && (cpc ?? 99) <= 1.5) return 'Watch';
  return 'Weak';
}

function actionForAd(row: MetaPerformanceRow, attributionAvailable: boolean) {
  if (row.spend < MIN_SPEND) return 'Not enough spend to judge';
  if (row.hookRate !== null && row.hookRate >= 20 && (row.ctr ?? 0) < 1) return 'Hook works, improve CTA/offer';
  if (row.hookRate !== null && row.hookRate < 10) return 'Test stronger first 3 seconds';
  if ((row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5) return attributionAvailable ? 'Keep and test more budget' : 'Keep creative, fix attribution';
  if (row.spend >= MIN_SPEND && (row.ctr ?? 0) < 1) return 'Refresh creative or pause';
  if (row.clicks >= 10 && !attributionAvailable) return 'Fix attribution before judging sales';
  return 'Keep testing';
}

function explanationFor(row: MetaPerformanceRow, attributionAvailable: boolean) {
  if (row.spend < MIN_SPEND) return 'This item has not spent enough to judge confidently yet.';
  if ((row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5 && !attributionAvailable) {
    return 'This creative has a strong CTR and acceptable CPC, but true Shopify attribution is missing, so we cannot know if it generated real customers.';
  }
  if (row.spend >= MIN_SPEND && (row.ctr ?? 0) < 1) return 'This item has enough spend and weak CTR, so the creative or hook likely needs to be refreshed.';
  return 'Use CTR and CPC as the current creative signal. Treat purchases as Meta-reported only until Shopify attribution is connected.';
}

function RankingTable({ title, rows, initialSortKey }: { title: string; rows: MetaPerformanceRow[]; initialSortKey: keyof MetaRow & string }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
        <SectionTitle>{title}</SectionTitle>
      </div>
      <SortableDataTable columns={rankingColumns} rows={rows as MetaRow[]} initialSortKey={initialSortKey} searchPlaceholder={`Search ${title.toLowerCase()}...`} />
    </Card>
  );
}

export function MetaAdsDashboardClient({ metrics }: { metrics: MetaAdsPerformanceMetrics }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedAdSetId, setSelectedAdSetId] = useState('');
  const [selectedAdId, setSelectedAdId] = useState('');

  const dateMatches = (firstDate: string | null, latestDate: string | null) => {
    const start = firstDate ? firstDate.slice(0, 10) : '';
    const end = latestDate ? latestDate.slice(0, 10) : '';
    if (from && end && end < from) return false;
    if (to && start && start > to) return false;
    return true;
  };
  const dailyDateMatches = (date: string) => (!from || date >= from) && (!to || date <= to);

  const campaigns = metrics.campaigns.filter((row) => dateMatches(row.firstDate, row.latestDate));
  const adSets = metrics.adSets
    .filter((row) => dateMatches(row.firstDate, row.latestDate))
    .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId);
  const ads = metrics.ads
    .filter((row) => dateMatches(row.firstDate, row.latestDate))
    .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId)
    .filter((row) => !selectedAdSetId || row.adSetId === selectedAdSetId);
  const selectedAd = metrics.ads.find((row) => row.id === selectedAdId);
  const selectedAdSet = metrics.adSets.find((row) => row.id === selectedAdSetId);
  const selectedCampaign = metrics.campaigns.find((row) => row.id === selectedCampaignId);
  const selectedItem = selectedAd ?? selectedAdSet ?? selectedCampaign ?? null;
  const selectedType = selectedAd ? 'Ad' : selectedAdSet ? 'Ad set' : selectedCampaign ? 'Campaign' : 'All Meta ads';
  const selectedRows = selectedAd ? [selectedAd] : selectedAdSet ? ads : selectedCampaign ? ads : ads;
  const kpis = sumRows(selectedRows.length ? selectedRows : metrics.ads);
  const quality = trafficQuality(kpis.ctr, kpis.cpc);
  const enoughSpendAds = ads.filter((row) => row.spend >= MIN_SPEND);
  const insufficientSpendAds = ads.filter((row) => row.spend < MIN_SPEND);
  const hookAvailable = ads.some((row) => row.hookRate !== null);
  const dailyRows = aggregateDaily(
    metrics.daily
      .filter((row) => dailyDateMatches(row.date))
      .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId)
      .filter((row) => !selectedAdSetId || row.adSetId === selectedAdSetId)
      .filter((row) => !selectedAdId || row.adId === selectedAdId),
  );
  const bestCtr = [...enoughSpendAds].sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0)).slice(0, 8);
  const bestCpc = [...enoughSpendAds].filter((row) => row.cpc !== null).sort((a, b) => (a.cpc ?? 0) - (b.cpc ?? 0)).slice(0, 8);
  const bestHook = [...enoughSpendAds].filter((row) => row.hookRate !== null).sort((a, b) => (b.hookRate ?? 0) - (a.hookRate ?? 0)).slice(0, 8);
  const bestPurchases = [...enoughSpendAds].filter((row) => row.purchases !== null).sort((a, b) => (b.purchases ?? 0) - (a.purchases ?? 0)).slice(0, 8);
  const worstCtr = [...enoughSpendAds].sort((a, b) => (a.ctr ?? 0) - (b.ctr ?? 0)).slice(0, 8);
  const worstCpc = [...enoughSpendAds].filter((row) => row.cpc !== null).sort((a, b) => (b.cpc ?? 0) - (a.cpc ?? 0)).slice(0, 8);
  const highSpendWeak = [...enoughSpendAds].filter((row) => (row.ctr ?? 0) < 1).sort((a, b) => b.spend - a.spend).slice(0, 8);

  const clearSelection = () => {
    setSelectedCampaignId('');
    setSelectedAdSetId('');
    setSelectedAdId('');
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 800 }}>
          Use this page to decide which creatives to scale, watch, or pause.
        </p>
        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
          Ads under {formatEuro(MIN_SPEND)} spend are not judged. Meta-reported purchases are not true Shopify-attributed sales. True CAC/ROAS requires UTM + session + order attribution.
        </p>
      </Card>

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
          <button type="button" onClick={() => { setFrom(''); setTo(''); clearSelection(); }} style={{ padding: '9px 12px', borderRadius: 7, border: '1px solid #E8E6E1', background: '#FFFFFF', color: '#722F37', cursor: 'pointer', fontWeight: 700 }}>
            Clear selection
          </button>
          <div style={{ color: '#6B6B6B', fontSize: 12 }}>
            Selection: <strong>{selectedType}</strong>{selectedItem ? ` · ${selectedItem.name}` : ''} · Date range: {formatDate(metrics.firstDate)} to {formatDate(metrics.latestDate)}
          </div>
        </div>
      </Card>

      <PageSection>
        <SectionTitle sub="Current selection KPIs">Are Meta Ads Working?</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <MetricCard label="Spend" value={formatEuro(kpis.spend)} />
          <MetricCard label="Impressions" value={formatNumber(kpis.impressions)} />
          <MetricCard label="Clicks" value={formatNumber(kpis.clicks)} />
          <MetricCard label="CTR" value={formatPercent(kpis.ctr)} tone={metricTone(quality)} />
          <MetricCard label="CPC" value={formatEuro(kpis.cpc)} tone={metricTone(quality)} />
          <MetricCard label="CPM" value={formatEuro(kpis.cpm)} />
          <MetricCard label="Meta-reported purchases" value={formatNumber(kpis.purchases)} />
          <MetricCard label="Meta CPA" value={formatEuro(kpis.cpa)} />
          <MetricCard label="Meta ROAS" value={formatNumber(kpis.roas, 2)} />
          <MetricCard label="Attribution status" value="True CAC/ROAS unavailable" tone="warning" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
          <Card><p style={{ margin: 0, color: quality === 'Good' ? '#2D6A4F' : quality === 'Watch' ? '#B45309' : '#C0392B', fontSize: 13, fontWeight: 800 }}>Traffic quality: {quality}</p></Card>
          <Card><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 800 }}>Attribution: Missing Shopify order attribution</p></Card>
          <Card><p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 800 }}>Decision: {quality === 'Good' ? 'Keep testing, fix attribution first' : quality === 'Watch' ? 'Keep testing' : 'Refresh creatives'}</p></Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub={`Only ads with spend >= ${formatEuro(MIN_SPEND)} are judged`}>Best Ads With Enough Spend</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          <RankingTable title="Best ads by CTR" rows={bestCtr.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="ctr" />
          <RankingTable title="Best ads by CPC" rows={bestCpc.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="cpc" />
          {hookAvailable ? <RankingTable title="Best ads by hook rate" rows={bestHook.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="hookRate" /> : null}
          {metrics.attributionAvailable ? <RankingTable title="Best ads by Meta purchases" rows={bestPurchases.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="purchases" /> : null}
          <RankingTable title="Worst ads by CTR" rows={worstCtr.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="ctr" />
          <RankingTable title="Worst ads by CPC" rows={worstCpc.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="cpc" />
          <RankingTable title="High spend but weak results" rows={highSpendWeak.map((row) => ({ ...row, recommendedAction: actionForAd(row, false) }))} initialSortKey="spend" />
        </div>
        {insufficientSpendAds.length ? (
          <Card style={{ marginTop: 12 }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
              {formatNumber(insufficientSpendAds.length)} ads are below {formatEuro(MIN_SPEND)} spend and are labeled insufficient spend instead of best/worst.
            </p>
          </Card>
        ) : null}
      </PageSection>

      <PageSection>
        <SectionTitle sub="Charts update with campaign, ad set, or ad selection">Daily Performance</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          <Card><SectionTitle>Traffic: Spend</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.spend }))} color="#722F37" /></Card>
          <Card><SectionTitle>Traffic: Clicks</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.clicks }))} color="#2D6A4F" /></Card>
          <Card><SectionTitle>Efficiency: CPC</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.cpc ?? 0 }))} color="#B45309" /></Card>
          <Card><SectionTitle>Efficiency: CTR</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.ctr ?? 0 }))} color="#A67C00" /></Card>
          {metrics.attributionAvailable ? (
            <>
              <Card><SectionTitle>Meta Sales: Purchases</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.purchases ?? 0 }))} color="#2D6A4F" /></Card>
              <Card><SectionTitle>Meta Sales: CPA</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.cpa ?? 0 }))} color="#B45309" /></Card>
            </>
          ) : null}
        </div>
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <SortableDataTable columns={dailyColumns} rows={dailyRows as DailyRow[]} initialSortKey="date" initialSortDirection="desc" searchPlaceholder="Search daily rows..." />
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Click campaign, then ad set, then ad">Campaign → Ad Set → Ad Drilldown</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}><SectionTitle>Campaigns</SectionTitle></div>
            <SortableDataTable columns={drillColumns} rows={campaigns as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedCampaignId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.id)); setSelectedAdSetId(''); setSelectedAdId(''); }} searchPlaceholder="Search campaigns..." />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}><SectionTitle>Ad Sets</SectionTitle></div>
            <SortableDataTable columns={drillColumns} rows={adSets as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedAdSetId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.campaignId)); setSelectedAdSetId(String(row.id)); setSelectedAdId(''); }} searchPlaceholder="Search ad sets..." />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}><SectionTitle>Ads</SectionTitle></div>
            <SortableDataTable columns={drillColumns} rows={ads as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedAdId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.campaignId)); setSelectedAdSetId(String(row.adSetId)); setSelectedAdId(String(row.id)); }} searchPlaceholder="Search ads..." />
          </Card>
        </div>
      </PageSection>

      {selectedItem ? (
        <PageSection>
          <SectionTitle sub="Plain-language interpretation">Selected Item Detail</SectionTitle>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <MetricCard label="Selected type" value={selectedType} />
              <MetricCard label="Spend" value={formatEuro(selectedItem.spend)} />
              <MetricCard label="Impressions" value={formatNumber(selectedItem.impressions)} />
              <MetricCard label="Clicks" value={formatNumber(selectedItem.clicks)} />
              <MetricCard label="CTR" value={formatPercent(selectedItem.ctr)} />
              <MetricCard label="CPC" value={formatEuro(selectedItem.cpc)} />
              <MetricCard label="CPM" value={formatEuro(selectedItem.cpm)} />
              <MetricCard label="Hook rate" value={formatPercent(selectedItem.hookRate)} />
              <MetricCard label="Meta purchases" value={formatNumber(selectedItem.purchases)} />
              <MetricCard label="Meta CPA" value={formatEuro(selectedItem.cpa)} />
              <MetricCard label="Meta ROAS" value={formatNumber(selectedItem.roas, 2)} />
            </div>
            <div style={{ marginTop: 16, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>{selectedItem.name}</div>
            <p style={{ margin: '6px 0', color: '#6B6B6B', fontSize: 13 }}>
              Date range: {formatDate(selectedItem.firstDate)} to {formatDate(selectedItem.latestDate)} · Label: {selectedItem.spend < MIN_SPEND ? 'Insufficient spend' : selectedItem.performanceLabel}
            </p>
            <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13, fontWeight: 800 }}>
              Recommended action: {actionForAd(selectedItem, false)}
            </p>
            <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              {explanationFor(selectedItem, false)}
            </p>
          </Card>
        </PageSection>
      ) : null}
    </>
  );
}

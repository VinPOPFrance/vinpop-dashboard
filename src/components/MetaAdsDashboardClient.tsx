'use client';

import { useState } from 'react';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { LineChart } from '@/components/dashboard/LineChart';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import type { MetaAdsPerformanceMetrics, MetaDailyPerformancePoint, MetaPerformanceRow } from '@/lib/db';

const DEFAULT_MIN_SPEND = 15;
const BEST_ADS_MIN_SPEND = 20;

type MetaRow = MetaPerformanceRow & Record<string, unknown>;
type DailyRow = MetaDailyPerformancePoint & Record<string, unknown>;
type StatusFilter = 'All' | 'Scale candidate' | 'Keep testing' | 'Watch' | 'Weak creative' | 'Insufficient spend' | 'Attribution missing';

const drillColumns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Name', type: 'text', width: 220 },
  { key: 'postClickQuality', label: 'Traffic quality post-click', type: 'text', description: 'Simple score based on active clickers %, cost per add to cart, and purchases.' },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'landingPageViews', label: 'Landing page views', type: 'number', description: 'Users who reached your landing page after clicking the ad.' },
  { key: 'activeClickRate', label: 'Active clickers %', type: 'percent', description: 'Landing page views / clicks. Percent of clickers that really arrived on site.' },
  { key: 'videoPlayToLandingRate', label: 'Video play to LPV %', type: 'percent', description: 'Landing page views / video plays. Shows transfer from video attention to site visit.' },
  { key: 'costPerLandingPageView', label: 'Cost per LPV', type: 'money', description: 'Spend / landing page views. Lower is better.' },
  { key: 'costPerAddToCart', label: 'Cost per add to cart', type: 'money', description: 'Spend / add to cart events. Lower is better.' },
  { key: 'addToCart', label: 'Add to cart', type: 'number', description: 'Add to cart events reported by Meta.' },
  { key: 'cpa', label: 'Cost per purchase', type: 'money', description: 'Spend / purchases. Lower is better.' },
  { key: 'purchases', label: 'Purchases', type: 'number', description: 'Purchases reported by Meta.' },
  { key: 'performanceLabel', label: 'Status', type: 'text' },
];

const decisionColumns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Ad', type: 'text', width: 220 },
  { key: 'postClickQuality', label: 'Traffic quality post-click', type: 'text', description: 'Simple score based on active clickers %, cost per add to cart, and purchases.' },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'landingPageViews', label: 'LPV', type: 'number', description: 'Landing page views after ad click.' },
  { key: 'activeClickRate', label: 'Active clickers %', type: 'percent', description: 'Landing page views / clicks.' },
  { key: 'videoPlayToLandingRate', label: 'Video play to LPV %', type: 'percent', description: 'Landing page views / video plays.' },
  { key: 'costPerAddToCart', label: 'Cost per add to cart', type: 'money', description: 'Spend / add to cart events.' },
  { key: 'cpa', label: 'Cost per purchase', type: 'money', description: 'Spend / purchases.' },
  { key: 'purchases', label: 'Purchases', type: 'number', description: 'Purchases reported by Meta.' },
  { key: 'recommendedAction', label: 'Action', type: 'text', width: 260 },
];

const bestAdsColumns: SortableColumn<MetaRow>[] = [
  { key: 'name', label: 'Ad', type: 'text', width: 220 },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'landingPageViews', label: 'LPV', type: 'number', description: 'Landing page views after ad click.' },
  { key: 'costPerLandingPageView', label: 'Cost per LPV', type: 'money', description: 'Spend / landing page views. Lower is better.' },
  { key: 'activeClickRate', label: 'Active clickers %', type: 'percent', description: 'Landing page views / clicks.' },
  { key: 'videoPlayToLandingRate', label: 'Video play to LPV %', type: 'percent', description: 'Landing page views / video plays.' },
  { key: 'costPerAddToCart', label: 'Cost per add to cart', type: 'money', description: 'Spend / add to cart events.' },
  { key: 'cpa', label: 'Cost per purchase', type: 'money', description: 'Spend / purchases.' },
  { key: 'purchases', label: 'Purchases', type: 'number', description: 'Purchases reported by Meta.' },
];

const dailyColumns: SortableColumn<DailyRow>[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'spend', label: 'Spend', type: 'money' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'landingPageViews', label: 'Landing page views', type: 'number', description: 'Users who reached your landing page on this date.' },
  { key: 'activeClickRate', label: 'Active clickers %', type: 'percent', description: 'Landing page views / clicks on this date.' },
  { key: 'videoPlays', label: 'Video plays', type: 'number', description: 'Video play actions used as engagement proxy.' },
  { key: 'videoPlayToLandingRate', label: 'Video play to LPV %', type: 'percent', description: 'Landing page views / video plays on this date.' },
  { key: 'addToCart', label: 'Add to cart', type: 'number', description: 'Add to cart events on this date.' },
  { key: 'costPerLandingPageView', label: 'Cost per LPV', type: 'money', description: 'Spend / landing page views.' },
  { key: 'costPerAddToCart', label: 'Cost per add to cart', type: 'money', description: 'Spend / add to cart.' },
  { key: 'purchases', label: 'Purchases', type: 'number', description: 'Purchases reported on this date.' },
  { key: 'cpa', label: 'Cost per purchase', type: 'money', description: 'Spend / purchases.' },
];

const selectStyle = {
  border: '1px solid #E8E6E1',
  borderRadius: 7,
  padding: '8px 10px',
  color: '#1A1A1A',
  background: '#FFFFFF',
  fontSize: 13,
};

const awarenessObjectivePattern = /(awareness|reach|brand|impression|video[_\s-]*view|outcome_awareness|outcome_engagement|visibility)/i;
const explicitBestAdsExclusionPattern = /(cic\s*wine\s*tasting\s*ad)/i;

function isAwarenessObjective(row: MetaPerformanceRow): boolean {
  const objective = row.campaignObjective ?? '';
  return awarenessObjectivePattern.test(objective);
}

function isExplicitlyExcludedFromBestAds(row: MetaPerformanceRow): boolean {
  const haystack = [row.name, row.campaignName, row.parentName, row.creativeLabel].filter(Boolean).join(' ');
  return explicitBestAdsExclusionPattern.test(haystack);
}

function sumRows(rows: MetaPerformanceRow[]) {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const landingPageViews = rows.reduce((sum, row) => sum + (row.landingPageViews ?? 0), 0);
  const addToCart = rows.reduce((sum, row) => sum + (row.addToCart ?? 0), 0);
  const videoPlays = rows.reduce((sum, row) => sum + (row.videoPlays ?? 0), 0);
  const purchases = rows.reduce((sum, row) => sum + (row.purchases ?? 0), 0);
  const purchaseValue = rows.reduce((sum, row) => sum + (row.purchaseValue ?? 0), 0);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions ? (clicks / impressions) * 100 : null,
    cpc: clicks ? spend / clicks : null,
    cpm: impressions ? (spend / impressions) * 1000 : null,
    landingPageViews: landingPageViews > 0 ? landingPageViews : null,
    activeClickRate: clicks > 0 && landingPageViews > 0 ? (landingPageViews / clicks) * 100 : null,
    videoPlays: videoPlays > 0 ? videoPlays : null,
    videoPlayToLandingRate: videoPlays > 0 && landingPageViews > 0 ? (landingPageViews / videoPlays) * 100 : null,
    costPerLandingPageView: landingPageViews > 0 ? spend / landingPageViews : null,
    addToCart: addToCart > 0 ? addToCart : null,
    costPerAddToCart: addToCart > 0 ? spend / addToCart : null,
    purchases: purchases > 0 ? purchases : null,
    cpa: purchases > 0 ? spend / purchases : null,
    roas: purchaseValue > 0 && spend > 0 ? purchaseValue / spend : null,
  };
}

function aggregateDaily(rows: MetaDailyPerformancePoint[]) {
  const byDate = new Map<string, {
    spend: number;
    impressions: number;
    clicks: number;
    landingPageViews: number;
    videoPlays: number;
    addToCart: number;
    purchases: number;
    purchaseValue: number;
  }>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? {
      spend: 0,
      impressions: 0,
      clicks: 0,
      landingPageViews: 0,
      videoPlays: 0,
      addToCart: 0,
      purchases: 0,
      purchaseValue: 0,
    };
    current.spend += row.spend;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.landingPageViews += row.landingPageViews ?? 0;
    current.videoPlays += row.videoPlays ?? 0;
    current.addToCart += row.addToCart ?? 0;
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
    landingPageViews: row.landingPageViews > 0 ? row.landingPageViews : null,
    activeClickRate: row.clicks > 0 && row.landingPageViews > 0 ? (row.landingPageViews / row.clicks) * 100 : null,
    videoPlays: row.videoPlays > 0 ? row.videoPlays : null,
    videoPlayToLandingRate: row.videoPlays > 0 && row.landingPageViews > 0 ? (row.landingPageViews / row.videoPlays) * 100 : null,
    costPerLandingPageView: row.landingPageViews > 0 ? row.spend / row.landingPageViews : null,
    addToCart: row.addToCart > 0 ? row.addToCart : null,
    costPerAddToCart: row.addToCart > 0 ? row.spend / row.addToCart : null,
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

function metricTone(status: string): 'default' | 'good' | 'warning' {
  return status === 'Good' ? 'good' : status === 'Weak' ? 'warning' : 'default';
}

function rowStatus(row: MetaPerformanceRow, minSpend: number): StatusFilter {
  if (row.spend < minSpend) return 'Insufficient spend';
  if (row.performanceLabel === 'Scale candidate') return 'Scale candidate';
  if (row.performanceLabel === 'Attribution missing') return 'Attribution missing';
  if (row.performanceLabel === 'Weak creative') return 'Weak creative';
  if (row.performanceLabel === 'Watch') return 'Watch';
  return 'Keep testing';
}

function statusMatches(row: MetaPerformanceRow, status: StatusFilter, minSpend: number) {
  return status === 'All' || rowStatus(row, minSpend) === status;
}

function actionForAd(row: MetaPerformanceRow, minSpend: number) {
  if (row.spend < minSpend) return 'Not enough spend to judge';
  if (row.hookRate !== null && row.hookRate >= 20 && (row.ctr ?? 0) < 1) return 'Hook works, improve CTA/offer';
  if (row.hookRate !== null && row.hookRate < 10) return 'Test stronger first 3 seconds';
  if ((row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5) return 'Keep creative, fix attribution';
  if ((row.ctr ?? 0) < 1) return 'Refresh creative or pause';
  if (row.clicks >= 10) return 'Fix attribution before judging sales';
  return 'Keep testing';
}

function explanationFor(row: MetaPerformanceRow, minSpend: number) {
  if (row.spend < minSpend) return 'This item has not spent enough to judge confidently yet.';
  if ((row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5) {
    return 'This creative has strong CTR and acceptable CPC, but Shopify attribution is missing. It is a good creative candidate, but we cannot prove sales yet.';
  }
  if ((row.ctr ?? 0) < 1) return 'This item has enough spend and weak CTR, so the creative or hook likely needs to be refreshed.';
  return 'Use CTR and CPC as the current creative signal. Treat purchases as Meta-reported only until Shopify attribution is connected.';
}

function tooltip(row: DailyRow) {
  return [
    row.date,
    `Spend: ${formatEuro(row.spend)}`,
    `Clicks: ${formatNumber(row.clicks)}`,
    `Landing page views: ${formatNumber(row.landingPageViews)}`,
    `Active clickers: ${formatPercent(row.activeClickRate)}`,
    `Video plays: ${formatNumber(row.videoPlays)}`,
    `Video play to LPV: ${formatPercent(row.videoPlayToLandingRate)}`,
    row.addToCart ? `Add to cart: ${formatNumber(row.addToCart)}` : '',
    row.costPerAddToCart ? `Cost per add to cart: ${formatEuro(row.costPerAddToCart)}` : '',
    row.purchases ? `Purchases: ${formatNumber(row.purchases)}` : '',
    row.cpa ? `Cost per purchase: ${formatEuro(row.cpa)}` : '',
  ].filter(Boolean).join('\n');
}

function DecisionTable({
  title,
  rows,
  initialSortKey,
}: {
  title: string;
  rows: MetaPerformanceRow[];
  initialSortKey: keyof MetaRow & string;
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
        <SectionTitle sub={`${formatNumber(rows.length)} ads`}>{title}</SectionTitle>
      </div>
      {rows.length ? (
        <SortableDataTable columns={decisionColumns} rows={rows as MetaRow[]} initialSortKey={initialSortKey} searchPlaceholder={`Search ${title.toLowerCase()}...`} />
      ) : (
        <p style={{ margin: 0, padding: 16, color: '#6B6B6B', fontSize: 13 }}>No ads in this group for the current filters.</p>
      )}
    </Card>
  );
}

export function MetaAdsDashboardClient({ metrics }: { metrics: MetaAdsPerformanceMetrics }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minSpend, setMinSpend] = useState(DEFAULT_MIN_SPEND);
  const [campaignMinSpend, setCampaignMinSpend] = useState(0);
  const [adSetMinSpend, setAdSetMinSpend] = useState(0);
  const [adMinSpend, setAdMinSpend] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedAdSetId, setSelectedAdSetId] = useState('');
  const [selectedAdId, setSelectedAdId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dateMatches = (firstDate: string | null, latestDate: string | null) => {
    const start = firstDate ? firstDate.slice(0, 10) : '';
    const end = latestDate ? latestDate.slice(0, 10) : '';
    if (from && end && end < from) return false;
    if (to && start && start > to) return false;
    return true;
  };
  const dailyDateMatches = (date: string) => (!from || date >= from) && (!to || date <= to);
  const campaignIdsFromStatus = new Set(metrics.ads.filter((row) => statusMatches(row, statusFilter, minSpend)).map((row) => row.campaignId));
  const adSetIdsFromStatus = new Set(metrics.ads.filter((row) => statusMatches(row, statusFilter, minSpend)).map((row) => row.adSetId));
  const campaigns = metrics.campaigns
    .filter((row) => dateMatches(row.firstDate, row.latestDate))
    .filter((row) => row.spend >= minSpend || statusFilter === 'All')
    .filter((row) => statusFilter === 'All' || campaignIdsFromStatus.has(row.id))
    .filter((row) => row.spend >= campaignMinSpend);
  const adSets = metrics.adSets
    .filter((row) => dateMatches(row.firstDate, row.latestDate))
    .filter((row) => row.spend >= minSpend || statusFilter === 'All')
    .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId)
    .filter((row) => statusFilter === 'All' || adSetIdsFromStatus.has(row.id))
    .filter((row) => row.spend >= adSetMinSpend);
  const ads = metrics.ads
    .filter((row) => dateMatches(row.firstDate, row.latestDate))
    .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId)
    .filter((row) => !selectedAdSetId || row.adSetId === selectedAdSetId)
    .filter((row) => statusMatches(row, statusFilter, minSpend))
    .filter((row) => row.spend >= adMinSpend);
  const selectedAd = metrics.ads.find((row) => row.id === selectedAdId);
  const selectedAdSet = metrics.adSets.find((row) => row.id === selectedAdSetId);
  const selectedCampaign = metrics.campaigns.find((row) => row.id === selectedCampaignId);
  const selectedItem = selectedAd ?? selectedAdSet ?? selectedCampaign ?? null;
  const selectedType = selectedAd ? 'Ad' : selectedAdSet ? 'Ad set' : selectedCampaign ? 'Campaign' : 'All Meta ads';
  const selectedRows = selectedAd ? [selectedAd] : selectedAdSet ? ads : selectedCampaign ? ads : ads;
  const kpis = sumRows(selectedRows.length ? selectedRows : metrics.ads);
  const enoughSpendAds = ads.filter((row) => row.spend >= minSpend);
  const insufficientSpendAds = ads.filter((row) => row.spend < minSpend);
  const dailyRows = aggregateDaily(
    metrics.daily
      .filter((row) => dailyDateMatches(row.date))
      .filter((row) => !selectedCampaignId || row.campaignId === selectedCampaignId)
      .filter((row) => !selectedAdSetId || row.adSetId === selectedAdSetId)
      .filter((row) => !selectedAdId || row.adId === selectedAdId),
  );
  const selectedDay = dailyRows.find((row) => row.date === selectedDate) ?? null;
  const withActions = (rows: MetaPerformanceRow[]) => rows.map((row) => ({ ...row, recommendedAction: actionForAd(row, minSpend) }));
  const scaleCandidates = withActions(
    [...enoughSpendAds]
      .filter((row) => (row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6),
  );
  const watchAds = withActions(
    [...enoughSpendAds]
      .filter((row) => (row.ctr ?? 0) >= 1 && (row.cpc ?? 99) <= 1.5 && !((row.ctr ?? 0) >= 2 && (row.cpc ?? 99) <= 0.5))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6),
  );
  const refreshAds = withActions(
    [...enoughSpendAds]
      .filter((row) => (row.ctr ?? 0) < 1 || (row.cpc ?? 0) > 1.5 || (row.hookRate !== null && row.hookRate < 10))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 6),
  );
  const bestAdsPool = ads.filter((row) => row.spend >= BEST_ADS_MIN_SPEND);
  const objectiveMismatchAds = bestAdsPool.filter((row) => isAwarenessObjective(row));
  const explicitExclusionAds = bestAdsPool.filter((row) => isExplicitlyExcludedFromBestAds(row));
  const unknownObjectiveAds = bestAdsPool.filter((row) => !row.campaignObjective);
  const bestAds = [...bestAdsPool]
    .filter((row) => !isAwarenessObjective(row))
    .filter((row) => !isExplicitlyExcludedFromBestAds(row))
    .filter((row) => (row.landingPageViews ?? 0) > 0)
    .sort((a, b) => {
      const aCost = a.costPerLandingPageView ?? Number.POSITIVE_INFINITY;
      const bCost = b.costPerLandingPageView ?? Number.POSITIVE_INFINITY;
      if (aCost !== bCost) return aCost - bCost;

      const aActive = a.activeClickRate ?? 0;
      const bActive = b.activeClickRate ?? 0;
      if (aActive !== bActive) return bActive - aActive;

      const aPurchases = a.purchases ?? 0;
      const bPurchases = b.purchases ?? 0;
      if (aPurchases !== bPurchases) return bPurchases - aPurchases;

      const aAtc = a.addToCart ?? 0;
      const bAtc = b.addToCart ?? 0;
      return bAtc - aAtc;
    })
    .slice(0, 5);
  const insufficientSpendSummary = withActions([...insufficientSpendAds].sort((a, b) => b.spend - a.spend).slice(0, 6));
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
          Focus is on clickers who become active on site (landing page views), then add to cart and purchases. Ads under {formatEuro(minSpend)} spend are not judged.
        </p>
      </Card>

      <PageSection>
        <SectionTitle sub="Current selection KPIs">Are Meta Ads Working?</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <MetricCard label="Spend" value={formatEuro(kpis.spend)} />
          <MetricCard label="Clicks" value={formatNumber(kpis.clicks)} />
          <MetricCard label="Landing page views" value={formatNumber(kpis.landingPageViews)} />
          <MetricCard label="Active clickers %" value={formatPercent(kpis.activeClickRate)} />
          <MetricCard label="Video plays" value={formatNumber(kpis.videoPlays)} />
          <MetricCard label="Video play to LPV %" value={formatPercent(kpis.videoPlayToLandingRate)} />
          <MetricCard label="Cost per LPV" value={formatEuro(kpis.costPerLandingPageView)} />
          <MetricCard label="Add to cart" value={formatNumber(kpis.addToCart)} />
          <MetricCard label="Cost per add to cart" value={formatEuro(kpis.costPerAddToCart)} />
          <MetricCard label="Number of purchases" value={formatNumber(kpis.purchases)} />
          <MetricCard label="Cost per purchase" value={formatEuro(kpis.cpa)} />
          <MetricCard label="Shopify attribution" value="True CAC/ROAS unavailable" tone="warning" />
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub={`Ranked by Cost per LPV, then Active clickers %, then Purchases. Minimum spend: ${formatEuro(BEST_ADS_MIN_SPEND)}.`}>Best Ads Right Now</SectionTitle>
        {objectiveMismatchAds.length ? (
          <Card style={{ marginBottom: 10, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              {formatNumber(objectiveMismatchAds.length)} ad(s) excluded from this ranking because campaign objective is awareness/visibility (including {objectiveMismatchAds.slice(0, 3).map((row) => row.name).join(', ')}{objectiveMismatchAds.length > 3 ? ', ...' : ''}).
            </p>
          </Card>
        ) : null}
        {explicitExclusionAds.length ? (
          <Card style={{ marginBottom: 10, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              {formatNumber(explicitExclusionAds.length)} ad(s) excluded by manual rule (including {explicitExclusionAds.slice(0, 3).map((row) => row.name).join(', ')}{explicitExclusionAds.length > 3 ? ', ...' : ''}).
            </p>
          </Card>
        ) : null}
        {unknownObjectiveAds.length ? (
          <Card style={{ marginBottom: 10, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              {formatNumber(unknownObjectiveAds.length)} ad(s) have no objective available in the campaigns table and are still included in ranking if they pass spend and LPV criteria.
            </p>
          </Card>
        ) : null}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {bestAds.length ? (
            <SortableDataTable
              columns={bestAdsColumns}
              rows={bestAds as MetaRow[]}
              initialSortKey="costPerLandingPageView"
              initialSortDirection="asc"
              searchPlaceholder="Search best ads..."
            />
          ) : (
            <p style={{ margin: 0, padding: 16, color: '#6B6B6B', fontSize: 13 }}>
              No ad has enough post-click data yet for this ranking.
            </p>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Controls first, output next">Campaign / Ad Set / Ad Selector</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ color: '#6B6B6B', fontSize: 12 }}>
              From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} style={{ display: 'block', marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }} />
            </label>
            <label style={{ color: '#6B6B6B', fontSize: 12 }}>
              To
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} style={{ display: 'block', marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }} />
            </label>
            <label style={{ color: '#6B6B6B', fontSize: 12 }}>
              Min spend
              <input type="number" value={minSpend} min={0} step={1} onChange={(event) => setMinSpend(Number(event.target.value) || 0)} style={{ display: 'block', width: 100, marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }} />
            </label>
            <label style={{ color: '#6B6B6B', fontSize: 12 }}>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} style={{ ...selectStyle, display: 'block', marginTop: 4 }}>
                {['All', 'Scale candidate', 'Keep testing', 'Watch', 'Weak creative', 'Insufficient spend', 'Attribution missing'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setFrom(''); setTo(''); setMinSpend(DEFAULT_MIN_SPEND); setStatusFilter('All'); clearSelection(); }} style={{ padding: '9px 12px', borderRadius: 7, border: '1px solid #E8E6E1', background: '#FFFFFF', color: '#722F37', cursor: 'pointer', fontWeight: 700 }}>
              Clear selection
            </button>
            <div style={{ color: '#6B6B6B', fontSize: 12 }}>
              Selection: <strong>{selectedType}</strong>{selectedItem ? ` · ${selectedItem.name}` : ''}
            </div>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Campaigns</SectionTitle>
              <label style={{ color: '#6B6B6B', fontSize: 12, display: 'inline-block', marginTop: 10 }}>
                Min spend (campaigns)
                <input
                  type="number"
                  value={campaignMinSpend}
                  min={0}
                  step={1}
                  onChange={(event) => setCampaignMinSpend(Number(event.target.value) || 0)}
                  style={{ display: 'block', width: 120, marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }}
                />
              </label>
            </div>
            <SortableDataTable columns={drillColumns} rows={campaigns as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedCampaignId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.id)); setSelectedAdSetId(''); setSelectedAdId(''); }} searchPlaceholder="Search campaigns..." />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Ad Sets</SectionTitle>
              <label style={{ color: '#6B6B6B', fontSize: 12, display: 'inline-block', marginTop: 10 }}>
                Min spend (ad sets)
                <input
                  type="number"
                  value={adSetMinSpend}
                  min={0}
                  step={1}
                  onChange={(event) => setAdSetMinSpend(Number(event.target.value) || 0)}
                  style={{ display: 'block', width: 120, marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }}
                />
              </label>
            </div>
            <SortableDataTable columns={drillColumns} rows={adSets as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedAdSetId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.campaignId)); setSelectedAdSetId(String(row.id)); setSelectedAdId(''); }} searchPlaceholder="Search ad sets..." />
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E1' }}>
              <SectionTitle>Ads</SectionTitle>
              <label style={{ color: '#6B6B6B', fontSize: 12, display: 'inline-block', marginTop: 10 }}>
                Min spend (ads)
                <input
                  type="number"
                  value={adMinSpend}
                  min={0}
                  step={1}
                  onChange={(event) => setAdMinSpend(Number(event.target.value) || 0)}
                  style={{ display: 'block', width: 120, marginTop: 4, padding: 8, border: '1px solid #E8E6E1', borderRadius: 7 }}
                />
              </label>
            </div>
            <SortableDataTable columns={drillColumns} rows={ads as MetaRow[]} initialSortKey="spend" selectedRowKey={selectedAdId} getRowKey={(row) => row.id} onRowClick={(row) => { setSelectedCampaignId(String(row.campaignId)); setSelectedAdSetId(String(row.adSetId)); setSelectedAdId(String(row.id)); }} searchPlaceholder="Search ads..." />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Shown immediately after selection">Selected Item Detail</SectionTitle>
        <Card>
          {selectedItem ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <MetricCard label="Selected type" value={selectedType} />
                <MetricCard label="Spend" value={formatEuro(selectedItem.spend)} />
                <MetricCard label="Clicks" value={formatNumber(selectedItem.clicks)} />
                <MetricCard label="Landing page views" value={formatNumber(selectedItem.landingPageViews)} />
                <MetricCard label="Active clickers %" value={formatPercent(selectedItem.activeClickRate)} />
                <MetricCard label="Video plays" value={formatNumber(selectedItem.videoPlays)} />
                <MetricCard label="Video play to LPV %" value={formatPercent(selectedItem.videoPlayToLandingRate)} />
                <MetricCard label="Cost per LPV" value={formatEuro(selectedItem.costPerLandingPageView)} />
                <MetricCard label="Add to cart" value={formatNumber(selectedItem.addToCart)} />
                <MetricCard label="Cost per add to cart" value={formatEuro(selectedItem.costPerAddToCart)} />
                <MetricCard label="Number of purchases" value={formatNumber(selectedItem.purchases)} />
                <MetricCard label="Cost per purchase" value={formatEuro(selectedItem.cpa)} />
                <MetricCard label="Meta ROAS" value={formatNumber(selectedItem.roas, 2)} />
              </div>
              <div style={{ marginTop: 16, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>{selectedItem.name}</div>
              <p style={{ margin: '6px 0', color: '#6B6B6B', fontSize: 13 }}>
                Date range: {formatDate(selectedItem.firstDate)} to {formatDate(selectedItem.latestDate)} · Status: {rowStatus(selectedItem, minSpend)}
              </p>
              <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13, fontWeight: 800 }}>
                Recommended action: {actionForAd(selectedItem, minSpend)}
              </p>
              <p style={{ margin: '8px 0 0', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
                {explanationFor(selectedItem, minSpend)}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>Click a campaign, ad set, or ad to see the detail here.</p>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <SectionTitle sub={`Creative decisions. Only ads with spend >= ${formatEuro(minSpend)} are judged.`}>Creative Decision Summary</SectionTitle>
        <Card style={{ marginBottom: 12, borderColor: '#F2C94C', background: '#FFFCF0' }}>
          <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 800, lineHeight: 1.5 }}>
            Prioritize creative that brings clickers to real landing page views, then add to cart and purchases. Good clicks with weak LPV or ATC means friction after click.
          </p>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          <DecisionTable title="Scale candidates" rows={scaleCandidates} initialSortKey="spend" />
          <DecisionTable title="Watch / keep testing" rows={watchAds} initialSortKey="spend" />
          <DecisionTable title="Refresh or pause" rows={refreshAds} initialSortKey="spend" />
          <DecisionTable title="Insufficient spend" rows={insufficientSpendSummary} initialSortKey="spend" />
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Updates with date range and current selection. Click a point to inspect that day.">Daily Performance</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          {selectedDay ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <SectionTitle sub="Selected chart point">Selected Day Detail</SectionTitle>
                <button type="button" onClick={() => setSelectedDate(null)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E6E1', background: '#FFFFFF', color: '#722F37', cursor: 'pointer', fontWeight: 700 }}>
                  Clear date
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <MetricCard label="Date" value={formatDate(selectedDay.date)} />
                <MetricCard label="Spend" value={formatEuro(selectedDay.spend)} />
                <MetricCard label="Clicks" value={formatNumber(selectedDay.clicks)} />
                <MetricCard label="Landing page views" value={formatNumber(selectedDay.landingPageViews)} />
                <MetricCard label="Active clickers %" value={formatPercent(selectedDay.activeClickRate)} />
                <MetricCard label="Video plays" value={formatNumber(selectedDay.videoPlays)} />
                <MetricCard label="Video play to LPV %" value={formatPercent(selectedDay.videoPlayToLandingRate)} />
                <MetricCard label="Add to cart" value={formatNumber(selectedDay.addToCart)} />
                <MetricCard label="Cost per LPV" value={formatEuro(selectedDay.costPerLandingPageView)} />
                <MetricCard label="Cost per add to cart" value={formatEuro(selectedDay.costPerAddToCart)} />
                <MetricCard label="Purchases" value={formatNumber(selectedDay.purchases)} />
                <MetricCard label="Cost per purchase" value={formatEuro(selectedDay.cpa)} />
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
              Click any daily chart point to see post-click activity quality and conversion metrics for that date.
            </p>
          )}
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          <Card><SectionTitle>Landing Page Views</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.landingPageViews ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#2D6A4F" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card>
          <Card><SectionTitle>Active Clickers %</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.activeClickRate ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#A67C00" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card>
          <Card><SectionTitle>Video Play to LPV %</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.videoPlayToLandingRate ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#B45309" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card>
          <Card><SectionTitle>Add to Cart</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.addToCart ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#8E4B10" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card>
          <Card><SectionTitle>Cost per Add to Cart</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.costPerAddToCart ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#7A1F36" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card>
          {metrics.attributionAvailable ? <Card><SectionTitle>Purchases</SectionTitle><LineChart data={dailyRows.map((row) => ({ label: row.date, value: row.purchases ?? 0, tooltip: tooltip(row as DailyRow) }))} color="#2D6A4F" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} /></Card> : null}
        </div>
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#722F37', fontSize: 13, fontWeight: 800 }}>Daily metric table</summary>
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
            <SortableDataTable columns={dailyColumns} rows={dailyRows as DailyRow[]} initialSortKey="date" initialSortDirection="desc" searchPlaceholder="Search daily rows..." />
          </Card>
        </details>
      </PageSection>
    </>
  );
}

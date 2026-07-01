import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedMetaAdsOverviewSummary, rangeCacheArgs } from '@/lib/cachedDb';
import { getFoodPairingIntelligence, getRatingsIntelligence, getShopifyOrdersSummary, getTrackingReadiness } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

function statusColor(good: boolean) {
  return good ? '#2D6A4F' : '#B45309';
}

export default async function DataQualityPage() {
  await connection();
  const defaultRange = getDateRangeFromSearchParams({ range: '30d' });
  const rangeArgs = rangeCacheArgs(defaultRange);
  const [trackingResult, metaResult, ordersResult, ratingsResult, foodPairingResult] = await Promise.all([
    timeAsync('page:/data-quality getTrackingReadiness', () => getTrackingReadiness()),
    timeAsync('page:/data-quality getMetaAdsOverviewSummary', () => getCachedMetaAdsOverviewSummary(...rangeArgs)),
    timeAsync('page:/data-quality getShopifyOrdersSummary', () => getShopifyOrdersSummary()),
    timeAsync('page:/data-quality getRatingsIntelligence', () => getRatingsIntelligence()),
    timeAsync('page:/data-quality getFoodPairingIntelligence', () => getFoodPairingIntelligence()),
  ]);
  const tracking = trackingResult.ok ? trackingResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const orders = ordersResult.ok ? ordersResult.metrics : null;
  const ratings = ratingsResult.ok ? ratingsResult.metrics : null;
  const foodPairing = foodPairingResult.ok ? foodPairingResult.metrics : null;
  const ga4Rows = tracking?.ga4TablesWithRows.length ?? 0;
  const ratingsMappingReady = Boolean(ratings?.wineLevelAnalysisAvailable);
  const hasTrueSessionTracking = Boolean(tracking?.availableTables.some((table) => table.matchedColumns.some((column) => column.toLowerCase() === 'session_id' || column.toLowerCase() === 'visitor_id')));

  return (
    <DashboardLayout>
      <TopBar title="Data Quality" subtitle="One place for technical readiness checks" />
      <PageSection>
        <SectionTitle sub="Technical diagnostics. Aggregate counts and metadata only.">Dashboard Data Status</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            This page replaces the old daily-navigation diagnostic clutter. No phone numbers, addresses, raw payloads, or database credentials are displayed.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
          <MetricCard label="GA4 aggregate reports" value={ga4Rows > 0 ? 'Available' : 'Missing'} tone={ga4Rows ? 'good' : 'warning'} />
          <MetricCard label="True visitor/session tracking" value={hasTrueSessionTracking ? 'Available' : 'Missing'} tone={hasTrueSessionTracking ? 'good' : 'warning'} />
          <MetricCard label="Meta platform attribution" value={meta?.attributionAvailable ? 'Available' : 'Missing'} tone={meta?.attributionAvailable ? 'good' : 'warning'} />
          <MetricCard label="True Shopify CAC/ROAS attribution" value="Missing" tone="warning" />
          <MetricCard label="Shopify orders" value={orders ? formatNumber(orders.totalOrders) : 'Unavailable'} tone={orders ? 'good' : 'warning'} />
          <MetricCard label="Ratings mapping" value={ratingsMappingReady ? 'Available' : 'Needs review'} tone={ratingsMappingReady ? 'good' : 'warning'} />
          <MetricCard label="Food pairing coverage" value={foodPairing ? formatPercent(foodPairing.pairingCoverageRate) : 'Unavailable'} tone={(foodPairing?.pairingCoverageRate ?? 0) >= 80 ? 'good' : 'warning'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            ['GA4 aggregate reports', ga4Rows > 0, ga4Rows > 0 ? `${formatNumber(ga4Rows)} GA4 aggregate report tables have rows.` : 'GA4 aggregate report tables need sync or date-range review.', '/acquisition-traffic'],
            ['True visitor/session tracking', hasTrueSessionTracking, hasTrueSessionTracking ? 'Visitor/session identifiers were detected in tracking-ready tables.' : 'Missing visitor_id/session_id level tracking tables.', '/tracking-readiness'],
            ['Meta platform attribution', Boolean(meta?.attributionAvailable), meta?.attributionAvailable ? 'Meta reports include purchase/action attribution fields.' : 'Meta spend/click rows exist but purchase attribution fields are missing.', '/attribution-readiness'],
            ['True Shopify CAC/ROAS attribution', false, 'Missing until UTM/session/order join exists between ad touchpoints and Shopify orders.', '/attribution-readiness'],
            ['Shopify data status', Boolean(orders), orders ? `${formatNumber(orders.totalOrders)} orders loaded.` : 'Shopify aggregate data could not be loaded.', '/shopify-orders-summary'],
            ['Ratings mapping status', ratingsMappingReady, ratingsMappingReady ? `${formatNumber(ratings?.uniqueRatedWines)} rated wines mapped.` : ratings?.wineLevelUnavailableReason ?? 'Ratings mapping could not be loaded.', '/ratings'],
            ['Food pairing coverage', (foodPairing?.pairingCoverageRate ?? 0) >= 80, foodPairing ? `${formatPercent(foodPairing.pairingCoverageRate)} of wines have pairing coverage.` : 'Food pairing data could not be loaded.', '/food-pairing-intelligence'],
          ].map(([title, good, body, href]) => (
            <Card key={title as string}>
              <div style={{ color: statusColor(Boolean(good)), fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                {good ? 'OK' : 'Needs review'}
              </div>
              <div style={{ marginTop: 6, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>{title as string}</div>
              <p style={{ margin: '8px 0 10px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{body as string}</p>
              <a href={href as string} style={{ color: '#722F37', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open detail</a>
            </Card>
          ))}
          <Card>
            <div style={{ color: '#6B6B6B', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Diagnostic link</div>
            <div style={{ marginTop: 6, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>Performance Diagnostics</div>
            <p style={{ margin: '8px 0 10px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              Recent helper timings, likely bottlenecks, and cache notes.
            </p>
            <a href="/performance-diagnostics" style={{ color: '#722F37', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open performance</a>
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

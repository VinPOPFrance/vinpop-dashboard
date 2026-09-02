import { Suspense } from 'react';
import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AcquisitionTabs, parseAcquisitionTab } from '@/components/funnel/AcquisitionTabs';
import { FunnelPipelineBar, FunnelPipelineBarSkeleton } from '@/components/funnel/FunnelPipelineBar';
import { TopBar } from '@/components/TopBar';
import {
  AlertBanner,
  Card,
  ChartFrame,
  DataTable,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  colors,
  type DataTableColumn,
} from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import {
  getCachedGoogleAdsKeywordPerformance,
  getCachedMetaAdsOverviewSummary,
  getCachedMetaAdsPerformance,
  rangeCacheArgs,
} from '@/lib/cachedDb';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 2 du funnel : acquisition publicitaire.
 *
 * Deux regies, deux onglets, une meme question : combien coute une visite qui
 * vaut la peine ? Cote Meta on juge la creative (hook rate, cout par Landing
 * Page View) ; cote Google on juge le mot-cle (cout et conversion).
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[1];

/** Ligne du tableau des creatives Meta : un script video par ligne. */
type CreativeRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  creative: string;
  campaign: string;
  spend: number;
  hookRate: number | null;
  costPerLandingPageView: number | null;
  landingPageViews: number | null;
  ctr: number | null;
  purchases: number | null;
  action: string;
};

const creativeColumns: DataTableColumn<CreativeRow>[] = [
  { key: 'creative', label: 'Script / creative', type: 'text', strong: true, width: 240 },
  { key: 'campaign', label: 'Campagne', type: 'text' },
  { key: 'spend', label: 'Depense', type: 'money' },
  {
    key: 'hookRate',
    label: 'Hook rate',
    type: 'percent',
    description: 'Part des impressions qui accrochent les premieres secondes. Plus c est haut, plus le debut du script fonctionne.',
  },
  {
    key: 'costPerLandingPageView',
    label: 'CPLPV',
    type: 'money',
    description: 'Cout par Landing Page View : ce que coute une visite reellement chargee.',
  },
  { key: 'landingPageViews', label: 'LPV', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'purchases', label: 'Achats', type: 'number' },
  { key: 'action', label: 'Action', type: 'text' },
];

/** Ligne du tableau des mots-cles Google Ads. */
type KeywordTableRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  keyword: string;
  matchType: string;
  clicks: number;
  cost: number;
  costPerClick: number | null;
  ctr: number | null;
  conversions: number;
  verdict: string;
  action: string;
};

const keywordColumns: DataTableColumn<KeywordTableRow>[] = [
  { key: 'keyword', label: 'Mot-cle', type: 'text', strong: true, width: 220 },
  { key: 'matchType', label: 'Correspondance', type: 'text' },
  { key: 'clicks', label: 'Clics', type: 'number' },
  {
    key: 'cost',
    label: 'Cout',
    type: 'money',
    description: 'cost_micros / 1 000 000, converti en euros.',
  },
  { key: 'costPerClick', label: 'Cout / clic', type: 'money' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'conversions', label: 'Conversions', type: 'number' },
  { key: 'verdict', label: 'Verdict', type: 'text' },
  { key: 'action', label: 'Action', type: 'text' },
];

const VERDICT_LABEL: Record<string, string> = {
  converting: 'Convertit',
  trap: 'Piege',
  watch: 'A surveiller',
  'insufficient-clicks': 'Trop peu de clics',
};

export default async function Step2Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const range = getDateRangeFromSearchParams(params);
  const tab = parseAcquisitionTab(params.tab);

  return (
    <DashboardLayout>
      <TopBar
        title="Acquisition publicitaire"
        subtitle="Meta Ads et Google Ads : ce que coute une visite reellement qualifiee"
        step={STEP.step}
      />

      {/* La bande des 7 etapes lit sept sources : elle ne doit jamais retarder
          le contenu de la page, qui n en lit qu une. */}
      <Suspense fallback={<FunnelPipelineBarSkeleton />}>
        <FunnelPipelineBar currentStep={STEP.step} searchParams={params} />
      </Suspense>

      <AcquisitionTabs active={tab} searchParams={params} />

      {tab === 'meta' ? <MetaTab range={range} /> : <GoogleTab range={range} />}
    </DashboardLayout>
  );
}

/** Onglet Meta Ads : depense quotidienne, hook rate, CPLPV et creatives. */
async function MetaTab({ range }: { range: ReturnType<typeof getDateRangeFromSearchParams> }) {
  const [summaryResult, performanceResult] = await Promise.all([
    timeAsync(
      'page:/funnel/2-acquisition getMetaAdsOverviewSummary',
      () => getCachedMetaAdsOverviewSummary(...rangeCacheArgs(range)),
      { category: 'page', cacheStatus: 'unknown' },
    ),
    timeAsync(
      'page:/funnel/2-acquisition getMetaAdsPerformance',
      () => getCachedMetaAdsPerformance(),
      { category: 'page', cacheStatus: 'unknown' },
    ),
  ]);

  if (!performanceResult.ok) {
    return (
      <PageSection>
        <AlertBanner tone="critical" title="Donnees Meta Ads indisponibles">
          {performanceResult.reason === 'missing-url'
            ? 'DATABASE_URL n est pas configure.'
            : 'La lecture des insights Meta a echoue.'}
        </AlertBanner>
      </PageSection>
    );
  }

  const metrics = performanceResult.metrics;
  const daily = summaryResult.ok ? summaryResult.metrics.daily : [];

  // Le CPLPV global n est pas stocke : on le reconstruit depuis les creatives,
  // en ne comptant que celles qui ont reellement des Landing Page Views.
  const adsWithLandingViews = metrics.ads.filter((ad) => (ad.landingPageViews ?? 0) > 0);
  const totalLandingViews = adsWithLandingViews.reduce((sum, ad) => sum + (ad.landingPageViews ?? 0), 0);
  const spendOnLandingViews = adsWithLandingViews.reduce((sum, ad) => sum + ad.spend, 0);
  const costPerLandingPageView = totalLandingViews > 0 ? spendOnLandingViews / totalLandingViews : null;

  const creativeRows: CreativeRow[] = metrics.ads.map((ad) => ({
    id: ad.id,
    creative: ad.name || ad.creativeLabel,
    campaign: ad.campaignName,
    spend: ad.spend,
    hookRate: ad.hookRate,
    costPerLandingPageView: ad.costPerLandingPageView,
    landingPageViews: ad.landingPageViews,
    ctr: ad.ctr,
    purchases: ad.purchases,
    action: ad.recommendedAction,
  }));

  // Les scripts gagnants : hook rate le plus eleve parmi ceux qui ont assez de
  // depense pour etre juges. Trier sans ce filtre remonterait du bruit.
  const winningScripts = metrics.ads
    .filter((ad) => ad.sufficientSpend && ad.hookRate !== null)
    .sort((a, b) => (b.hookRate ?? 0) - (a.hookRate ?? 0))
    .slice(0, 3);

  return (
    <>
      <PageSection>
        <StatGrid>
          <StatCard label="Depense Meta" value={formatEuro(metrics.totalSpend)} hint={range.label} />
          <StatCard
            label="Hook rate moyen"
            value={formatPercent(metrics.hookRate)}
            hint={metrics.hookMetric}
          />
          <StatCard
            label="Cout par Landing Page View"
            value={costPerLandingPageView !== null ? formatEuro(costPerLandingPageView) : 'Indisponible'}
            hint={
              totalLandingViews > 0
                ? `${formatNumber(totalLandingViews)} LPV mesurees`
                : 'Aucune Landing Page View remontee par Meta'
            }
          />
          <StatCard label="CTR" value={formatPercent(metrics.ctr)} />
          <StatCard label="Cout par clic" value={metrics.cpc !== null ? formatEuro(metrics.cpc) : 'Indisponible'} />
          <StatCard label="Creatives actives" value={formatNumber(metrics.adsCount)} />
        </StatGrid>
      </PageSection>

      {!metrics.attributionAvailable ? (
        <PageSection>
          <AlertBanner tone="info" title="Attribution Meta partielle">
            {metrics.attributionNote}
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <ChartFrame
          title="Depense quotidienne"
          sub={`Meta Ads · ${range.label}`}
          height={180}
          isEmpty={daily.length === 0}
          emptyMessage="Aucune depense Meta sur la periode selectionnee."
        >
          <BarChart
            data={daily.map((point) => ({
              label: point.date,
              value: Math.round(point.spend * 100) / 100,
              color: colors.brand,
            }))}
            format="number"
          />
        </ChartFrame>
      </PageSection>

      {winningScripts.length > 0 ? (
        <Section
          title="Scripts qui accrochent"
          sub="Meilleur hook rate parmi les creatives ayant assez de depense pour etre jugees."
          bare
        >
          <StatGrid min={240}>
            {winningScripts.map((ad) => (
              <StatCard
                key={ad.id}
                label={ad.name || ad.creativeLabel}
                value={formatPercent(ad.hookRate)}
                tone="good"
                hint={`${formatEuro(ad.spend)} depenses · CPLPV ${
                  ad.costPerLandingPageView !== null ? formatEuro(ad.costPerLandingPageView) : 'n/d'
                }`}
              />
            ))}
          </StatGrid>
        </Section>
      ) : null}

      <Section
        title="Script video et performance"
        sub="Chaque ligne est une creative Meta. Trier par hook rate pour trouver les debuts de script qui marchent, par CPLPV pour ce qui amene le moins cher sur le site."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={creativeColumns}
            rows={creativeRows}
            initialSortKey="spend"
            searchPlaceholder="Filtrer un script ou une campagne..."
            emptyMessage="Aucune creative Meta sur la periode."
            rowKey="id"
          />
        </Card>
      </Section>
    </>
  );
}

/** Onglet Google Ads : economie par mot-cle et detection du trafic non qualifie. */
async function GoogleTab({ range }: { range: ReturnType<typeof getDateRangeFromSearchParams> }) {
  const result = await timeAsync(
    'page:/funnel/2-acquisition getGoogleAdsKeywordPerformance',
    () => getCachedGoogleAdsKeywordPerformance(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <PageSection>
        <AlertBanner tone="critical" title="Donnees Google Ads indisponibles">
          {result.reason === 'missing-url'
            ? 'DATABASE_URL n est pas configure.'
            : 'La lecture des tables Google Ads a echoue.'}
        </AlertBanner>
      </PageSection>
    );
  }

  const metrics = result.metrics;

  const keywordRows: KeywordTableRow[] = metrics.keywords.map((row) => ({
    id: `${row.keyword}.${row.matchType}`,
    keyword: row.keyword,
    matchType: row.matchType,
    clicks: row.clicks,
    cost: row.cost,
    costPerClick: row.costPerClick,
    ctr: row.ctr,
    conversions: row.conversions,
    verdict: VERDICT_LABEL[row.verdict] ?? row.verdict,
    action: row.recommendation,
  }));

  return (
    <>
      {metrics.trapKeywords.length > 0 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${metrics.trapKeywords.length} mot(s)-cle piege : ${formatEuro(metrics.wastedCost)} depenses sans une seule conversion`}
          >
            {metrics.trapKeywords
              .slice(0, 5)
              .map((row) => `${row.keyword} (${formatEuro(row.cost)}, ${formatNumber(row.clicks)} clics)`)
              .join(' · ')}
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard label="Cout Google Ads" value={formatEuro(metrics.totalCost)} hint={range.label} />
          <StatCard label="Clics" value={formatNumber(metrics.totalClicks)} />
          <StatCard
            label="Cout par clic"
            value={metrics.averageCostPerClick !== null ? formatEuro(metrics.averageCostPerClick) : 'Indisponible'}
          />
          <StatCard label="CTR" value={formatPercent(metrics.averageCtr)} />
          <StatCard
            label="Conversions"
            value={formatNumber(metrics.totalConversions, 1)}
            tone={metrics.totalConversions > 0 ? 'good' : 'warning'}
            hint={
              metrics.costPerConversion !== null
                ? `${formatEuro(metrics.costPerConversion)} par conversion`
                : 'Aucune conversion attribuee sur la periode'
            }
          />
          <StatCard
            label="Rebond du trafic Google Ads"
            value={formatPercent(metrics.paidSearchBounceRate)}
            tone={
              metrics.paidSearchBounceRate !== null && metrics.paidSearchBounceRate > 60 ? 'warning' : 'default'
            }
            hint={`${formatNumber(metrics.paidSearchSessions)} sessions google / cpc mesurees par GA4`}
          />
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Comment lire ce tableau.</strong> Les couts viennent de
            {' '}<code>keyword_view.metrics_cost_micros</code>, divises par 1 000 000. Le taux de rebond GA4
            n existe qu au niveau source / support : il vaut pour tout le trafic Google Ads, pas par mot-cle.
            Le signal equivalent disponible par mot-cle est l absence de conversion malgre des clics payes —
            c est ce qui declenche le verdict <strong>Piege</strong>, a partir de
            {' '}{metrics.minimumClicksForVerdict * 2} clics sans conversion.
          </p>
        </Card>
      </PageSection>

      <Section
        title="Mots-cles"
        sub="Trier par cout pour voir ou part le budget, par conversions pour voir ce qui rapporte."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={keywordColumns}
            rows={keywordRows}
            initialSortKey="cost"
            searchPlaceholder="Filtrer un mot-cle..."
            emptyMessage="Aucun mot-cle Google Ads sur la periode."
            rowKey="id"
          />
        </Card>
      </Section>
    </>
  );
}

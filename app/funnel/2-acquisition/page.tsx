import { Suspense } from 'react';
import Link from 'next/link';
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
  toneColors,
  type DataTableColumn,
} from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import {
  getCachedAcquisitionOrders,
  getCachedGoogleAdsKeywordPerformance,
  getCachedGoogleAdsTrafficQuality,
  getCachedMetaAdsOverviewSummary,
  getCachedMetaAdsPerformance,
  getCachedMetaCreativeAttribution,
  rangeCacheArgs,
} from '@/lib/cachedDb';
import { hasAdScript } from '@/lib/adScripts';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';
import { MINIMUM_SPEND_FOR_REVIEW } from '@/lib/db/meta';
import { acquisitionChannelLabel } from '@/lib/db/acquisitionOrders';
import type {
  AcquisitionOrderRow,
  GoogleAdsTrafficMetrics,
  MetaAdSalesRow,
  MetaAttributedOrder,
  MetaCreativeAttributionMetrics,
  MetaPerformanceRow,
} from '@/lib/db/types';

/**
 * Etape 2 du funnel : acquisition publicitaire.
 *
 * Trois onglets, une meme question : combien coute une visite qui vaut la
 * peine, et qu est-ce qui la transforme en vente ?
 *
 *  - Meta   : on juge la creative (hook rate, cout par Landing Page View,
 *             ventes Shopify rattachees, script de la video).
 *  - Google : on juge le mot-cle (cout par arrivee, quality score, ventes) et
 *             la qualite du trafic achete par campagne (sessions, rebond) —
 *             un clic pas cher qui rebondit coute plus qu un clic cher qui
 *             reste.
 *  - Commandes : la vue inverse, qui part de la caisse. Une ligne par vente
 *             encaissee et ce qui l a amenee, pour verifier que les deux
 *             onglets precedents ne racontent pas qu une partie de l histoire.
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[1];

/** Ligne du tableau des creatives Meta : un script video par ligne. */
type CreativeRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  creative: string;
  /** Destination du lien porte par la colonne `creative`. */
  creativeHref: string;
  campaign: string;
  spend: number;
  hookRate: number | null;
  costPerLandingPageView: number | null;
  landingPageViews: number | null;
  ctr: number | null;
  purchases: number | null;
  shopifyOrders: number;
  shopifyRevenue: number | null;
  costPerSale: number | null;
  script: string;
};

const creativeColumns: DataTableColumn<CreativeRow>[] = [
  { key: 'creative', label: 'Script / creative', type: 'text', strong: true, width: 240, hrefKey: 'creativeHref' },
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
  {
    key: 'purchases',
    label: 'Achats Meta',
    type: 'number',
    description: 'Achats declares par Meta : chiffre modelise, a confronter aux ventes Shopify.',
  },
  {
    key: 'shopifyOrders',
    label: 'Ventes Shopify',
    type: 'number',
    description: 'Commandes Shopify non annulees dont l URL d arrivee designe cette creative.',
  },
  { key: 'shopifyRevenue', label: 'CA Shopify', type: 'money' },
  {
    key: 'costPerSale',
    label: 'Cout par vente',
    type: 'money',
    description: 'Depense de la creative divisee par ses ventes Shopify rattachees. Le CAC reel, pas celui de Meta.',
  },
  { key: 'script', label: 'Script', type: 'text', description: 'Script disponible dans Ads integral.xlsx.' },
];

/** Ligne du tableau des mots-cles Google Ads. */
type KeywordTableRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  keyword: string;
  matchType: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  costPerClick: number | null;
  ctr: number | null;
  qualityScore: number | null;
  conversions: number;
  shopifyOrders: number;
  verdict: string;
  action: string;
};

const keywordColumns: DataTableColumn<KeywordTableRow>[] = [
  { key: 'keyword', label: 'Mot-cle', type: 'text', strong: true, width: 220 },
  { key: 'matchType', label: 'Correspondance', type: 'text' },
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clics', type: 'number' },
  {
    key: 'cost',
    label: 'Cout',
    type: 'money',
    description: 'cost_micros / 1 000 000, converti en euros.',
  },
  {
    key: 'costPerClick',
    label: 'Cout par arrivee',
    type: 'money',
    description:
      'Cout par clic. Sur le reseau de recherche, un clic paye correspond a une arrivee sur la page : c est l equivalent Google du cout par Landing Page View de Meta.',
  },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  {
    key: 'qualityScore',
    label: 'Quality score',
    type: 'number',
    description:
      'Note Google de 1 a 10 sur la coherence entre la requete, l annonce et la page d arrivee. En dessous de 5, le clic est surpaye.',
  },
  { key: 'conversions', label: 'Conversions Google', type: 'number' },
  {
    key: 'shopifyOrders',
    label: 'Ventes Shopify',
    type: 'number',
    description: 'Commandes dont le gclid a ete retrouve dans les clics Google Ads pour ce mot-cle.',
  },
  { key: 'verdict', label: 'Verdict', type: 'text' },
  { key: 'action', label: 'Action', type: 'text' },
];

/** Ligne du tableau de qualite du trafic achete, une campagne Google par ligne. */
type CampaignTrafficRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  campaign: string;
  keywords: number;
  clicks: number;
  cost: number;
  costPerClick: number | null;
  sessions: number | null;
  costPerSession: number | null;
  bounceRate: number | null;
  orders: number;
  costPerOrder: number | null;
  verdict: string;
  action: string;
};

const campaignTrafficColumns: DataTableColumn<CampaignTrafficRow>[] = [
  { key: 'campaign', label: 'Campagne', type: 'text', strong: true, width: 240 },
  { key: 'keywords', label: 'Mots-cles', type: 'number' },
  { key: 'clicks', label: 'Clics payes', type: 'number' },
  { key: 'cost', label: 'Cout', type: 'money' },
  { key: 'costPerClick', label: 'Cout par clic', type: 'money' },
  {
    key: 'sessions',
    label: 'Sessions GA4',
    type: 'number',
    description: 'Sessions que GA4 rattache a cette campagne. Nettement moins de sessions que de clics signale un suivi incomplet ou des clics qui n atteignent jamais la page.',
  },
  {
    key: 'costPerSession',
    label: 'Cout par session',
    type: 'money',
    description: 'Cout de la campagne divise par les sessions reellement mesurees : le cout d une visite qui a vraiment charge.',
  },
  {
    key: 'bounceRate',
    label: 'Rebond',
    type: 'percent',
    tone: 'warning',
    description: 'Part des sessions reparties sans interaction (complement du taux d engagement GA4). C est ce qui transforme un clic pas cher en depense perdue.',
  },
  { key: 'orders', label: 'Ventes Shopify', type: 'number' },
  { key: 'costPerOrder', label: 'Cout par vente', type: 'money' },
  { key: 'verdict', label: 'Verdict', type: 'text' },
  { key: 'action', label: 'Action', type: 'text' },
];

/** Ligne du recapitulatif des commandes. */
type OrderTableRow = {
  /** Identifiant de ligne, non affiche : voir le prop `rowKey` de DataTable. */
  id: string;
  order: string;
  date: string | null;
  revenue: number;
  channel: string;
  detail: string;
  /** Destination du lien porte par la colonne `detail`, vide hors Meta. */
  detailHref: string;
  evidence: string;
  landing: string;
};

const orderColumns: DataTableColumn<OrderTableRow>[] = [
  { key: 'order', label: 'Commande', type: 'text', strong: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'revenue', label: 'Montant', type: 'money' },
  { key: 'channel', label: 'Canal', type: 'text' },
  {
    key: 'detail',
    label: 'Creative / mot-cle / origine',
    type: 'text',
    width: 260,
    hrefKey: 'detailHref',
    description: 'Ce que l URL d arrivee permet d identifier. Cliquable quand il s agit d une creative Meta.',
  },
  {
    key: 'evidence',
    label: 'Sur quelle preuve',
    type: 'text',
    description: 'Ce qui a permis de rattacher la commande : du plus sur (identifiant dans l URL) au plus faible (site referent).',
  },
  { key: 'landing', label: 'Page d arrivee', type: 'text' },
];

const CAMPAIGN_VERDICT_LABEL: Record<string, string> = {
  converting: 'Convertit',
  trap: 'Piege',
  watch: 'A surveiller',
  'insufficient-sessions': 'Trop peu de sessions',
};

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

      {tab === 'meta' ? <MetaTab range={range} searchParams={params} /> : null}
      {tab === 'google' ? <GoogleTab range={range} searchParams={params} /> : null}
      {tab === 'orders' ? <OrdersTab searchParams={params} /> : null}
    </DashboardLayout>
  );
}

/** Cout par vente reelle : null tant qu aucune vente n est rattachee. */
function costPerSale(spend: number, orders: number): number | null {
  return orders > 0 ? spend / orders : null;
}

/**
 * Reconstruit la query string courante en changeant un seul parametre.
 *
 * Rend une chaine vide quand il ne reste rien : le lien vers le detail d une
 * creative doit rester une URL propre, sans point d interrogation orphelin.
 */
function withParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
  value: string | null,
): string {
  const next = new URLSearchParams();
  for (const [name, raw] of Object.entries(searchParams)) {
    if (name === key || raw === undefined) continue;
    next.set(name, Array.isArray(raw) ? (raw[0] ?? '') : raw);
  }
  if (value !== null) next.set(key, value);
  const query = next.toString();
  return query ? `?${query}` : '';
}

/** Onglet Meta Ads : depense quotidienne, hook rate, CPLPV et creatives. */
async function MetaTab({
  range,
  searchParams,
}: {
  range: ReturnType<typeof getDateRangeFromSearchParams>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [summaryResult, performanceResult, attributionResult] = await Promise.all([
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
    timeAsync(
      'page:/funnel/2-acquisition getMetaCreativeAttribution',
      () => getCachedMetaCreativeAttribution(),
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
  const attribution = attributionResult.ok ? attributionResult.metrics : null;
  const salesByAd = new Map<string, MetaAdSalesRow>((attribution?.ads ?? []).map((row) => [row.adId, row]));

  // Le filtre par defaut : seules les creatives qui ont eu un vrai budget.
  const showAllCreatives = searchParams.creatives === 'all';
  const reviewedAds = metrics.ads.filter((ad) => ad.sufficientSpend);
  const visibleAds = showAllCreatives ? metrics.ads : reviewedAds;
  const hiddenAdsCount = metrics.ads.length - reviewedAds.length;

  const reviewedSpend = reviewedAds.reduce((sum, ad) => sum + ad.spend, 0);

  // Les agregats se recalculent sur le perimetre juge, pas sur le compte
  // entier : melanger les tests a 3 EUR aux videos a 500 EUR donnerait un hook
  // rate moyen que personne ne peut utiliser pour decider.
  const impressionsOnHook = reviewedAds.reduce((sum, ad) => sum + (ad.videoPlays === null ? 0 : ad.impressions), 0);
  const hookEvents = reviewedAds.reduce((sum, ad) => sum + (ad.videoPlays ?? 0), 0);
  const reviewedHookRate = impressionsOnHook > 0 ? (hookEvents / impressionsOnHook) * 100 : null;

  // Le CPLPV global n est pas stocke : on le reconstruit depuis les creatives,
  // en ne comptant que celles qui ont reellement des Landing Page Views.
  const adsWithLandingViews = reviewedAds.filter((ad) => (ad.landingPageViews ?? 0) > 0);
  const totalLandingViews = adsWithLandingViews.reduce((sum, ad) => sum + (ad.landingPageViews ?? 0), 0);
  const spendOnLandingViews = adsWithLandingViews.reduce((sum, ad) => sum + ad.spend, 0);
  const costPerLandingPageView = totalLandingViews > 0 ? spendOnLandingViews / totalLandingViews : null;

  const attributedOrders = reviewedAds.reduce((sum, ad) => sum + (salesByAd.get(ad.id)?.orders ?? 0), 0);
  const attributedRevenue = reviewedAds.reduce((sum, ad) => sum + (salesByAd.get(ad.id)?.revenue ?? 0), 0);
  const realCostPerSale = costPerSale(reviewedSpend, attributedOrders);

  const creativeRows: CreativeRow[] = visibleAds.map((ad) => {
    const sales = salesByAd.get(ad.id);
    return {
      id: ad.id,
      creative: ad.name || ad.creativeLabel,
      creativeHref: `/funnel/2-acquisition/${ad.id}${withParam(searchParams, 'creatives', null)}`,
      campaign: ad.campaignName,
      spend: ad.spend,
      hookRate: ad.hookRate,
      costPerLandingPageView: ad.costPerLandingPageView,
      landingPageViews: ad.landingPageViews,
      ctr: ad.ctr,
      purchases: ad.purchases,
      shopifyOrders: sales?.orders ?? 0,
      shopifyRevenue: sales?.revenue ?? null,
      costPerSale: costPerSale(ad.spend, sales?.orders ?? 0),
      script: hasAdScript(ad.id, ad.name) ? 'Disponible' : 'Absent',
    };
  });

  // Ce qui vend vraiment : classement par ventes Shopify rattachees, pas par
  // achats declares par Meta. A egalite de ventes, le moins cher gagne.
  const bestSellers = reviewedAds
    .map((ad) => ({ ad, sales: salesByAd.get(ad.id) }))
    .filter((entry): entry is { ad: MetaPerformanceRow; sales: MetaAdSalesRow } => (entry.sales?.orders ?? 0) > 0)
    .sort((left, right) => right.sales.orders - left.sales.orders || left.ad.spend - right.ad.spend)
    .slice(0, 3);

  // Les scripts gagnants : hook rate le plus eleve du perimetre juge.
  const winningScripts = reviewedAds
    .filter((ad) => ad.hookRate !== null)
    .sort((left, right) => (right.hookRate ?? 0) - (left.hookRate ?? 0))
    .slice(0, 3);

  return (
    <>
      <PageSection>
        <StatGrid>
          <StatCard
            label={`Depense (creatives > ${MINIMUM_SPEND_FOR_REVIEW} EUR)`}
            value={formatEuro(reviewedSpend)}
            hint={`${formatNumber(reviewedAds.length)} creative(s) sur ${formatNumber(metrics.ads.length)} · depuis le debut du compte`}
          />
          <StatCard label="Hook rate moyen" value={formatPercent(reviewedHookRate)} hint={metrics.hookMetric} />
          <StatCard
            label="Cout par Landing Page View"
            value={costPerLandingPageView !== null ? formatEuro(costPerLandingPageView) : 'Indisponible'}
            hint={
              totalLandingViews > 0
                ? `${formatNumber(totalLandingViews)} LPV mesurees`
                : 'Aucune Landing Page View remontee par Meta'
            }
          />
          <StatCard
            label="Ventes rattachees a une creative"
            value={
              attribution === null
                ? formatNumber(attributedOrders)
                : `${formatNumber(attributedOrders)} / ${formatNumber(attribution.paidOrders)}`
            }
            tone={attributedOrders > 0 ? 'good' : 'warning'}
            hint={
              attribution === null
                ? 'Rapprochement des commandes Shopify indisponible.'
                : `${formatEuro(attributedRevenue)} sur ${formatEuro(attribution.paidRevenue)} de ventes payees dans Shopify. Voir la lecture detaillee ci-dessous.`
            }
          />
          <StatCard
            label="Cout par vente reelle"
            value={realCostPerSale !== null ? formatEuro(realCostPerSale) : 'Indisponible'}
            tone={realCostPerSale !== null && realCostPerSale > 30 ? 'critical' : 'default'}
            hint={
              attribution !== null && attribution.unattributedOrders > 0
                ? `Plafond : ${formatNumber(attribution.unattributedOrders)} commande(s) Meta restent sans creative identifiee.`
                : 'Depense du perimetre divisee par les ventes Shopify rattachees.'
            }
          />
          <StatCard label="CTR" value={formatPercent(metrics.ctr)} hint="Tout le compte, toutes creatives confondues" />
        </StatGrid>
      </PageSection>

      {attribution === null ? (
        <PageSection>
          <AlertBanner tone="warning" title="Ventes Shopify non rattachees aux creatives">
            {attributionResult.ok === false && attributionResult.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La lecture des commandes Shopify a echoue : les colonnes de ventes restent vides.'}
          </AlertBanner>
        </PageSection>
      ) : (
        <SalesReconciliation attribution={attribution} />
      )}

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

      {bestSellers.length > 0 ? (
        <Section
          title="Ce qui a genere le plus de ventes"
          sub="Commandes Shopify non annulees, rattachees a la creative par l URL d arrivee de la commande."
          bare
        >
          <StatGrid min={240}>
            {bestSellers.map(({ ad, sales }) => (
              <StatCard
                key={ad.id}
                label={ad.name || ad.creativeLabel}
                value={`${formatNumber(sales.orders)} vente(s)`}
                tone="good"
                hint={`${formatEuro(sales.revenue)} de CA · ${formatEuro(ad.spend)} depenses · ${
                  costPerSale(ad.spend, sales.orders) !== null
                    ? `${formatEuro(costPerSale(ad.spend, sales.orders))} par vente`
                    : 'cout par vente indisponible'
                }`}
              />
            ))}
          </StatGrid>
        </Section>
      ) : null}

      {winningScripts.length > 0 ? (
        <Section
          title="Scripts qui accrochent"
          sub={`Meilleur hook rate parmi les creatives ayant depasse ${MINIMUM_SPEND_FOR_REVIEW} EUR de budget.`}
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
        title={showAllCreatives ? 'Toutes les creatives' : `Creatives au-dessus de ${MINIMUM_SPEND_FOR_REVIEW} EUR de budget`}
        sub={`Cliquer sur une creative ouvre son script et le detail de ses ventes. Trier par hook rate pour trouver les debuts de script qui marchent, par cout par vente pour ce qui rapporte.${
          attribution === null
            ? ''
            : ` La colonne Ventes Shopify totalise ${formatNumber(attributedOrders)} des ${formatNumber(attribution.paidOrders)} ventes payees : les autres n identifient aucune creative, voir "D ou viennent les ventes" ci-dessus.`
        }`}
        actions={
          <Link
            href={withParam(searchParams, 'creatives', showAllCreatives ? null : 'all') || '?'}
            prefetch={false}
            style={{ fontSize: 12, color: colors.brand, textDecoration: 'none' }}
          >
            {showAllCreatives
              ? `Revenir aux creatives > ${MINIMUM_SPEND_FOR_REVIEW} EUR`
              : `Voir aussi les ${formatNumber(hiddenAdsCount)} creatives sous ${MINIMUM_SPEND_FOR_REVIEW} EUR`}
          </Link>
        }
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={creativeColumns}
            rows={creativeRows}
            initialSortKey="spend"
            searchPlaceholder="Filtrer un script ou une campagne..."
            emptyMessage="Aucune creative Meta au-dessus de ce budget."
            rowKey="id"
          />
        </Card>
      </Section>
    </>
  );
}

/**
 * Reconciliation des ventes : de la boutique entiere a la creative.
 *
 * Affichee parce que le nombre de ventes rattachees, seul, se lit comme le
 * total de la boutique et fait croire a un effondrement des ventes. Les trois
 * lignes disent exactement ou s arrete la mesure : combien la boutique a
 * vendu, combien de ces ventes viennent de Meta, et combien designent une
 * publicite precise. L ecart n est pas une perte de commandes, c est une perte
 * d information — et chaque ligne dit quoi corriger pour la combler.
 */
function SalesReconciliation({ attribution }: { attribution: MetaCreativeAttributionMetrics }) {
  const unattributed = attribution.orders.filter((order) => !order.adId);
  const outsideMeta = attribution.shopOrders - attribution.totalOrders;

  // Quatre causes distinctes de perte, quatre corrections distinctes : les
  // confondre ferait chercher le probleme au mauvais endroit. La cause tient a
  // ce qui manque dans l URL, pas au montant de la commande.
  function causeOf(order: MetaAttributedOrder): 'slug' | 'no-content' | 'fbclid' | 'referrer' {
    if (order.signal !== 'utm') return order.signal;
    return order.utmContent ? 'slug' : 'no-content';
  }

  const causes = [
    {
      id: 'slug' as const,
      title: 'balisee(s) avec un utm_content inconnu',
      detail: (order: MetaAttributedOrder) => `${order.orderName} : ${order.utmContent}`,
      fix: 'Ce slug est ecrit a la main et ne correspond a aucune annonce du compte. Faire porter a utm_content la variable Meta {{ad.id}} rattacherait ces ventes automatiquement.',
    },
    {
      id: 'no-content' as const,
      title: 'balisee(s) sans utm_content du tout',
      detail: (order: MetaAttributedOrder) => `${order.orderName} : ${order.utmCampaign ?? order.utmSource ?? 'utm partiel'}`,
      fix: 'La source est connue mais rien ne designe la publicite : le lien portait un balisage incomplet.',
    },
    {
      id: 'fbclid' as const,
      title: 'venue(s) d un clic Facebook sans aucun UTM',
      detail: (order: MetaAttributedOrder) => order.orderName,
      fix: 'Seul l identifiant de clic a survecu dans l URL : il prouve le passage par Meta mais ne nomme pas la publicite.',
    },
    {
      id: 'referrer' as const,
      title: 'arrivee(s) de Facebook / Instagram sans parametre',
      detail: (order: MetaAttributedOrder) => order.orderName,
      fix: 'Lien de bio, publication organique ou story sans balisage : la creative restera inconnue tant que ces liens ne porteront pas d UTM.',
    },
  ]
    .map((cause) => ({ ...cause, orders: unattributed.filter((order) => causeOf(order) === cause.id) }))
    .filter((cause) => cause.orders.length > 0);

  const steps = [
    {
      label: 'Ventes payees dans Shopify',
      value: attribution.paidOrders,
      revenue: attribution.paidRevenue,
      note: 'Le nombre affiche par l admin Shopify : toutes les commandes au statut "paid", remboursements exclus.',
      tone: 'default' as const,
    },
    {
      label: 'Dont non annulees',
      value: attribution.shopOrders,
      revenue: attribution.shopRevenue,
      note: `Perimetre retenu par tout le dashboard. ${formatNumber(outsideMeta)} d entre elles n ont aucun signe de passage par Meta (direct, Google, bouche a oreille).`,
      tone: 'default' as const,
    },
    {
      label: 'Dont venues de Meta',
      value: attribution.totalOrders,
      revenue: attribution.totalRevenue,
      note: 'Reconnues par leurs parametres UTM, par un identifiant de clic Facebook, ou par un site referent Facebook / Instagram.',
      tone: 'info' as const,
    },
    {
      label: 'Dont rattachees a une creative precise',
      value: attribution.attributedOrders,
      revenue: attribution.attributedRevenue,
      note: 'Les seules qui alimentent les colonnes "Ventes Shopify" et "Cout par vente" du tableau. Une vente de plus ici demande un lien mieux balise, pas une correction du dashboard.',
      tone: attribution.attributedOrders > 0 ? ('good' as const) : ('warning' as const),
    },
  ];

  return (
    <Section
      title="D ou viennent les ventes"
      sub="Le nombre de ventes par creative ne peut pas depasser ce que le balisage des liens permet de tracer. Cette lecture dit ou la chaine se coupe."
      bare
    >
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {steps.map((step) => (
            <div key={step.label}>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>{step.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: toneColors(step.tone).color }}>
                {formatNumber(step.value)}
                <span style={{ fontSize: 13, fontWeight: 400, color: colors.textSecondary }}>
                  {' '}· {formatEuro(step.revenue)}
                </span>
              </div>
              <p style={{ fontSize: 12, color: colors.textMuted, margin: '6px 0 0', lineHeight: 1.5 }}>{step.note}</p>
            </div>
          ))}
        </div>

        {causes.length > 0 ? (
          <>
            <p style={{ margin: '18px 0 0', fontSize: 12.5, fontWeight: 700, color: colors.text }}>
              Les {formatNumber(unattributed.length)} ventes Meta qui n arrivent pas jusqu a une creative
            </p>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.7 }}>
              {causes.map((cause) => (
                <li key={cause.id}>
                  <strong style={{ color: colors.text }}>
                    {formatNumber(cause.orders.length)} commande(s) {cause.title}
                  </strong>{' '}
                  ({cause.orders.map(cause.detail).join(' · ')}). {cause.fix}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </Section>
  );
}


/**
 * Ce que chaque source sait encore, et jusqu a quand.
 *
 * Google Ads, GA4 et le journal des clics ne s arretent pas le meme jour. Un
 * taux de rebond fige trois semaines en arriere, affiche a cote d une depense
 * du jour, se lit comme une mesure actuelle : cette note l empeche.
 */
function GoogleCoverageNote({ traffic }: { traffic: GoogleAdsTrafficMetrics }) {
  const rows = [
    { label: 'Derniere depense Google Ads', day: traffic.lastGoogleAdsDay },
    { label: 'Dernieres sessions du trafic paye vues par GA4', day: traffic.lastPaidSessionDay },
    { label: 'Dernier clic enregistre avec son gclid, qui rattache les ventes aux mots-cles', day: traffic.lastClickViewDay },
  ];

  return (
    <PageSection>
      <Card style={{ background: colors.surfaceMuted }}>
        <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.7 }}>
          <strong style={{ color: colors.text }}>Jusqu ou vont les mesures.</strong>{' '}
          {rows
            .map((row) => `${row.label} : jusqu au ${row.day ? formatDate(row.day) : 'aucune donnee'}`)
            .join(' · ')}
. Ces trois dates doivent rester proches : un ecart signifierait qu une colonne decrit une periode plus courte que la depense affichee.
        </p>
      </Card>
    </PageSection>
  );
}

/**
 * Onglet Commandes : une ligne par vente encaissee, avec son origine.
 *
 * Les deux autres onglets ne montrent que ce qu une regie a produit. Celui-ci
 * part de la caisse et remonte : c est le seul endroit ou l on voit, commande
 * par commande, pourquoi une vente n apparait dans aucun tableau publicitaire.
 */
async function OrdersTab({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const result = await timeAsync(
    'page:/funnel/2-acquisition getAcquisitionOrders',
    () => getCachedAcquisitionOrders(),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <PageSection>
        <AlertBanner tone="critical" title="Commandes indisponibles">
          {result.reason === 'missing-url'
            ? 'DATABASE_URL n est pas configure.'
            : 'La lecture des commandes Shopify a echoue.'}
        </AlertBanner>
      </PageSection>
    );
  }

  // Le perimetre est celui de l admin Shopify : les commandes payees. Une
  // commande remboursee ou annulee n a pas d origine a analyser, elle a une
  // cause a traiter ailleurs.
  const orders = result.metrics.orders.filter((order) => order.paid && !order.cancelled);
  const totalRevenue = orders.reduce((sum, order) => sum + order.revenue, 0);

  const byChannel = new Map<AcquisitionOrderRow['channel'], { orders: number; revenue: number }>();
  for (const order of orders) {
    const current = byChannel.get(order.channel) ?? { orders: 0, revenue: 0 };
    byChannel.set(order.channel, { orders: current.orders + 1, revenue: current.revenue + order.revenue });
  }
  const channels = [...byChannel.entries()].sort((left, right) => right[1].orders - left[1].orders);

  const query = withParam(searchParams, 'tab', null);
  const rows: OrderTableRow[] = orders.map((order) => ({
    id: order.orderId,
    order: order.orderName,
    date: order.createdAt,
    revenue: order.revenue,
    channel: acquisitionChannelLabel[order.channel],
    detail: order.detail,
    detailHref: order.adId ? `/funnel/2-acquisition/${order.adId}${query}` : '',
    evidence: order.evidence,
    landing: order.landingPath ?? '-',
  }));

  return (
    <>
      <PageSection>
        <StatGrid>
          <StatCard
            label="Ventes payees non annulees"
            value={formatNumber(orders.length)}
            hint={`${formatEuro(totalRevenue)} encaisses · le meme perimetre que la lecture de l onglet Meta Ads`}
          />
          {channels.map(([channel, totals]) => (
            <StatCard
              key={channel}
              label={acquisitionChannelLabel[channel]}
              value={formatNumber(totals.orders)}
              tone={channel === 'direct' ? 'warning' : 'default'}
              hint={`${formatEuro(totals.revenue)} · ${formatPercent((totals.orders / Math.max(orders.length, 1)) * 100)} des ventes`}
            />
          ))}
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: colors.text }}>Comment lire ce tableau.</strong> Le canal est deduit de l URL
            d arrivee de la commande (<code>landing_site</code>) et de son site referent, jamais du montant ni de la
            date. La colonne <strong>Sur quelle preuve</strong> dit ce qui a permis de conclure : un identifiant dans
            l URL est une certitude, un site referent une simple presomption.{' '}
            <strong>Direct / inconnu</strong> ne veut pas dire &laquo; sans publicite &raquo; : cela veut dire que le lien clique ne
            portait aucun parametre. C est la ligne a faire baisser en balisant les liens.
          </p>
        </Card>
      </PageSection>

      <Section
        title="Toutes les ventes encaissees"
        sub="Une ligne par commande payee. Cliquer sur une creative Meta ouvre son script et ses chiffres."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={orderColumns}
            rows={rows}
            initialSortKey="date"
            searchPlaceholder="Filtrer une commande, un canal, une creative..."
            emptyMessage="Aucune commande payee."
            rowKey="id"
          />
        </Card>
      </Section>
    </>
  );
}

/** Onglet Google Ads : economie par mot-cle et detection du trafic non qualifie. */
async function GoogleTab({
  range,
  searchParams,
}: {
  range: ReturnType<typeof getDateRangeFromSearchParams>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [result, trafficResult] = await Promise.all([
    timeAsync(
      'page:/funnel/2-acquisition getGoogleAdsKeywordPerformance',
      () => getCachedGoogleAdsKeywordPerformance(...rangeCacheArgs(range)),
      { category: 'page', cacheStatus: 'unknown' },
    ),
    timeAsync(
      'page:/funnel/2-acquisition getGoogleAdsTrafficQuality',
      () => getCachedGoogleAdsTrafficQuality(...rangeCacheArgs(range)),
      { category: 'page', cacheStatus: 'unknown' },
    ),
  ]);

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
  const traffic = trafficResult.ok ? trafficResult.metrics : null;

  // Une periode sans depense n est pas une erreur de lecture : les campagnes
  // Google sont a l arret depuis juillet. Le dire, et emmener d un clic vers la
  // periode qui contient l historique, evite de conclure que le tableau est
  // casse.
  const hasSpendInRange = metrics.totalCost > 0 || metrics.totalImpressions > 0;
  const lastSpendDay = traffic?.lastGoogleAdsDay ?? null;

  // Les ventes rattachees par gclid remontent au mot-cle exact : sans elles, le
  // tableau ne dit que ce que Google veut bien compter comme conversion.
  const salesByKeyword = new Map(
    (traffic?.keywordSales ?? []).map((row) => [row.keyword.trim().toLowerCase(), row]),
  );

  const keywordRows: KeywordTableRow[] = metrics.keywords.map((row) => {
    const sales = salesByKeyword.get(row.keyword.trim().toLowerCase());
    return {
      id: `${row.keyword}.${row.matchType}`,
      keyword: row.keyword,
      matchType: row.matchType,
      campaign: row.campaignName,
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      costPerClick: row.costPerClick,
      ctr: row.ctr,
      qualityScore: row.qualityScore,
      conversions: row.conversions,
      shopifyOrders: sales?.orders ?? 0,
      verdict: VERDICT_LABEL[row.verdict] ?? row.verdict,
      action: row.recommendation,
    };
  });

  const campaignRows: CampaignTrafficRow[] = (traffic?.campaigns ?? []).map((row) => ({
    id: row.campaignId || row.campaignName,
    campaign: row.campaignName,
    keywords: row.keywords,
    clicks: row.clicks,
    cost: row.cost,
    costPerClick: row.costPerClick,
    sessions: row.sessions,
    costPerSession: row.costPerSession,
    bounceRate: row.bounceRate,
    orders: row.orders,
    costPerOrder: row.costPerOrder,
    verdict: CAMPAIGN_VERDICT_LABEL[row.verdict] ?? row.verdict,
    action: row.recommendation,
  }));

  if (!hasSpendInRange) {
    return (
      <PageSection>
        <AlertBanner
          tone="info"
          title={`Aucune depense Google Ads sur la periode selectionnee (${range.label})`}
        >
          {lastSpendDay
            ? `Les campagnes Google sont a l arret : la derniere depense date du ${formatDate(lastSpendDay)}. Google continue d envoyer une ligne par mot-cle et par jour, a zero, ce qui n est pas une depense.`
            : 'Aucune depense Google Ads dans la base.'}{' '}
          <Link
            href={withParam({ ...searchParams, tab: 'google' }, 'period', 'all') || '?tab=google&period=all'}
            prefetch={false}
            style={{ color: colors.brand, textDecoration: 'none', fontWeight: 600 }}
          >
            Voir tout l historique Google Ads
          </Link>
          .
        </AlertBanner>
      </PageSection>
    );
  }

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

      {traffic !== null ? (
        <Section
          title="Qualite du trafic achete, par campagne"
          sub="Le piege du clic pas cher : un CPC bas avec un rebond eleve coute plus qu un CPC eleve qui retient. Le rebond n existe qu au niveau campagne, jamais par mot-cle."
          bare
        >
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              columns={campaignTrafficColumns}
              rows={campaignRows}
              initialSortKey="cost"
              enableSearch={false}
              emptyMessage="Aucune campagne Google Ads sur la periode."
              rowKey="id"
            />
          </Card>
        </Section>
      ) : null}

      {traffic !== null ? <GoogleCoverageNote traffic={traffic} /> : null}

      <Section
        title="Mots-cles"
        sub="Trier par cout par clic pour trouver les arrivees les moins cheres, par ventes pour ce qui rapporte vraiment. Sur le reseau de recherche, un clic paye est une arrivee sur la page : le cout par clic est donc le cout par landing page."
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

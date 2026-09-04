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
  getCachedGoogleAdsKeywordPerformance,
  getCachedMetaAdsOverviewSummary,
  getCachedMetaAdsPerformance,
  getCachedMetaCreativeAttribution,
  rangeCacheArgs,
} from '@/lib/cachedDb';
import { hasAdScript } from '@/lib/adScripts';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';
import { MINIMUM_SPEND_FOR_REVIEW } from '@/lib/db/meta';
import type {
  MetaAdSalesRow,
  MetaAttributedOrder,
  MetaCreativeAttributionMetrics,
  MetaPerformanceRow,
} from '@/lib/db/types';

/**
 * Etape 2 du funnel : acquisition publicitaire.
 *
 * Deux regies, deux onglets, une meme question : combien coute une visite qui
 * vaut la peine ? Cote Meta on juge la creative (hook rate, cout par Landing
 * Page View, ventes Shopify reellement rattachees) ; cote Google on juge le
 * mot-cle (cout et conversion).
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

      {tab === 'meta' ? <MetaTab range={range} searchParams={params} /> : <GoogleTab range={range} />}
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

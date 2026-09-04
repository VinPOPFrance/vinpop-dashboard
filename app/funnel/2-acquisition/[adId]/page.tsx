import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import {
  AlertBanner,
  Card,
  DataTable,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  colors,
  type DataTableColumn,
} from '@/components/ui';
import { getCachedMetaAdsPerformance, getCachedMetaCreativeAttribution, rangeCacheArgs } from '@/lib/cachedDb';
import { getDateRange } from '@/lib/analytics/dateRanges';
import { getAdScript } from '@/lib/adScripts';
import { MINIMUM_SPEND_FOR_REVIEW } from '@/lib/db/meta';
import { attributionMethodLabel } from '@/lib/db/metaAttribution';
import { formatDate, formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';
import type { MetaAttributedOrder } from '@/lib/db/types';

/**
 * Detail d une creative Meta : ses chiffres, son script, ses ventes.
 *
 * L etape 2 repond a "quelle video coute cher et laquelle vend". Cette page
 * repond a la question suivante, la seule qui permette d agir : "qu est-ce qui
 * est dit dans cette video, seconde par seconde". Les chiffres viennent de
 * Meta et de Shopify, le script du classeur "Ads integral.xlsx" importe par
 * `npm run import:ad-scripts`.
 *
 * La page se lit hors periode : une creative se juge sur toute sa vie, pas sur
 * les sept derniers jours, et son script ne change pas avec le selecteur de
 * dates de l en-tete.
 */

export const runtime = 'nodejs';

const BACK_HREF = '/funnel/2-acquisition';

/**
 * Cette page ignore volontairement la periode choisie dans l en-tete.
 *
 * Une creative se juge sur toute sa vie : son hook rate et ses ventes ne
 * veulent rien dire recadres sur sept jours, et son script ne change pas avec
 * le selecteur de dates.
 */
const LIFETIME = getDateRange('all');

/** Ligne du tableau des commandes rattachees a la creative. */
type OrderRow = {
  id: string;
  order: string;
  date: string | null;
  revenue: number;
  method: string;
  utmContent: string;
};

const orderColumns: DataTableColumn<OrderRow>[] = [
  { key: 'order', label: 'Commande', type: 'text', strong: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'revenue', label: 'Montant', type: 'money' },
  {
    key: 'method',
    label: 'Rattachement',
    type: 'text',
    description: 'Comment la commande a ete reliee a cette creative, du plus sur au moins sur.',
  },
  { key: 'utmContent', label: 'utm_content', type: 'text' },
];

export default async function AdDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ adId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { adId } = await params;
  const query = await searchParams;

  const [performanceResult, attributionResult] = await Promise.all([
    timeAsync(
      'page:/funnel/2-acquisition/[adId] getMetaAdsPerformance',
      () => getCachedMetaAdsPerformance(...rangeCacheArgs(LIFETIME)),
      { category: 'page', cacheStatus: 'unknown' },
    ),
    timeAsync(
      'page:/funnel/2-acquisition/[adId] getMetaCreativeAttribution',
      () => getCachedMetaCreativeAttribution(...rangeCacheArgs(LIFETIME)),
      { category: 'page', cacheStatus: 'unknown' },
    ),
  ]);

  if (!performanceResult.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Creative Meta" subtitle="Detail d une publicite" showDateRange={false} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees Meta Ads indisponibles">
            {performanceResult.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La lecture des insights Meta a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const ad = performanceResult.metrics.ads.find((row) => row.id === adId);
  if (!ad) notFound();

  const attribution = attributionResult.ok ? attributionResult.metrics : null;
  const sales = attribution?.ads.find((row) => row.adId === adId) ?? null;
  const orders: MetaAttributedOrder[] = (attribution?.orders ?? []).filter((order) => order.adId === adId);
  const script = getAdScript(ad.id, ad.name);

  const salesCount = sales?.orders ?? 0;
  const realCostPerSale = salesCount > 0 ? ad.spend / salesCount : null;
  const realRoas = sales && sales.revenue > 0 && ad.spend > 0 ? sales.revenue / ad.spend : null;

  const backHref = `${BACK_HREF}${buildQuery(query)}`;

  const orderRows: OrderRow[] = orders.map((order) => ({
    id: order.orderId,
    order: order.orderName,
    date: order.createdAt,
    revenue: order.revenue,
    method: order.method ? attributionMethodLabel[order.method] : 'Indetermine',
    utmContent: order.utmContent ?? '-',
  }));

  return (
    <DashboardLayout>
      <TopBar
        title={ad.name || ad.creativeLabel}
        subtitle={`${ad.campaignName} · ${ad.parentName}`}
        showDateRange={false}
      />

      <PageSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href={backHref} prefetch={false} style={{ fontSize: 12.5, color: colors.brand, textDecoration: 'none' }}>
            ← Retour a l acquisition
          </Link>
          <StatusBadge
            status={ad.sufficientSpend ? 'good' : 'warning'}
            label={
              ad.sufficientSpend
                ? 'Budget suffisant pour juger'
                : `Moins de ${MINIMUM_SPEND_FOR_REVIEW} EUR de budget`
            }
          />
          <span style={{ fontSize: 12, color: colors.textMuted }}>
            Statut Meta : {ad.status} · Diffusion du {formatDate(ad.firstDate)} au {formatDate(ad.latestDate)} ·
            {' '}Identifiant {ad.id}
          </span>
        </div>
      </PageSection>

      <PageSection>
        <StatGrid>
          <StatCard label="Depense" value={formatEuro(ad.spend)} hint="Depuis le premier jour de diffusion" />
          <StatCard
            label="Hook rate"
            value={formatPercent(ad.hookRate)}
            tone={ad.hookRate !== null && ad.hookRate < 10 ? 'critical' : 'default'}
            hint={ad.hookMetric}
          />
          <StatCard
            label="Cout par Landing Page View"
            value={ad.costPerLandingPageView !== null ? formatEuro(ad.costPerLandingPageView) : 'Indisponible'}
            hint={
              ad.landingPageViews !== null
                ? `${formatNumber(ad.landingPageViews)} visites reellement chargees`
                : 'Aucune Landing Page View remontee par Meta'
            }
          />
          <StatCard label="CTR" value={formatPercent(ad.ctr)} hint={`${formatNumber(ad.clicks)} clics`} />
          <StatCard
            label="Ventes Shopify rattachees"
            value={formatNumber(salesCount)}
            tone={salesCount > 0 ? 'good' : 'warning'}
            hint={salesCount > 0 ? `${formatEuro(sales?.revenue ?? 0)} de chiffre d affaires` : 'Aucune commande rattachee'}
          />
          <StatCard
            label="Cout par vente reelle"
            value={realCostPerSale !== null ? formatEuro(realCostPerSale) : 'Indisponible'}
            tone={realCostPerSale !== null && realCostPerSale > 30 ? 'critical' : 'default'}
            hint={realRoas !== null ? `ROAS reel ${realRoas.toFixed(2)}` : 'ROAS reel indisponible'}
          />
          <StatCard
            label="Achats declares par Meta"
            value={ad.purchases !== null ? formatNumber(ad.purchases) : 'Aucun'}
            hint="Chiffre modelise par Meta, a confronter aux ventes Shopify."
          />
          <StatCard label="Impressions" value={formatNumber(ad.impressions)} hint={`CPM ${ad.cpm !== null ? formatEuro(ad.cpm) : 'n/d'}`} />
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Action recommandee.</strong> {ad.recommendedAction}
            {' '}Verdict automatique : {ad.performanceLabel}. Qualite post-clic : {ad.postClickQuality}.
          </p>
        </Card>
      </PageSection>

      {script ? (
        <Section
          title={script.format === 'image' ? 'Composition de la publicite' : 'Script video, seconde par seconde'}
          sub={`Source : ${script.adName} · classeur Ads integral.xlsx (feuille ${script.sheet})`}
          bare
        >
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <ScriptTable headers={script.headers} rows={script.rows} />
          </Card>
        </Section>
      ) : (
        <PageSection>
          <AlertBanner tone="info" title="Aucun script pour cette creative">
            Le classeur Ads integral.xlsx ne contient pas de script pour cette publicite, ni sous son
            identifiant ({ad.id}) ni sous son nom. Ajouter une feuille au classeur puis relancer
            {' '}<code>npm run import:ad-scripts</code> la fera apparaitre ici.
          </AlertBanner>
        </PageSection>
      )}

      <Section
        title="Commandes rattachees a cette creative"
        sub="Commandes Shopify non annulees dont l URL d arrivee designe cette publicite."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={orderColumns}
            rows={orderRows}
            initialSortKey="date"
            enableSearch={false}
            emptyMessage={
              attribution === null
                ? 'Lecture des commandes Shopify indisponible.'
                : 'Aucune commande Shopify ne pointe vers cette creative.'
            }
            rowKey="id"
          />
        </Card>
      </Section>
    </DashboardLayout>
  );
}

/** Recopie la query string du tableau, pour revenir la ou on etait. */
function buildQuery(searchParams: Record<string, string | string[] | undefined>): string {
  const next = new URLSearchParams();
  for (const [name, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    next.set(name, Array.isArray(raw) ? (raw[0] ?? '') : raw);
  }
  const query = next.toString();
  return query ? `?${query}` : '';
}

/**
 * Tableau du script.
 *
 * `DataTable` n irait pas : il force une ligne par cellule (`nowrap`) alors
 * qu ici chaque cellule est une phrase, et il n a rien a trier ni a filtrer sur
 * huit lignes. Un tableau simple, avec le texte qui revient a la ligne et la
 * traduction francaise mise en avant.
 */
function ScriptTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: colors.surfaceMuted, color: colors.textSecondary, textAlign: 'left' }}>
            {headers.map((header) => (
              <th key={header} style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ borderTop: `1px solid ${colors.border}`, background: colors.surface }}>
              {headers.map((header, columnIndex) => {
                // Premiere colonne : le reperage (minutage ou element visuel).
                // Derniere colonne : la traduction francaise, c est elle qu on
                // relit pour reecrire un hook.
                const isAnchor = columnIndex === 0;
                const isTranslation = columnIndex === headers.length - 1;
                return (
                  <td
                    key={header}
                    style={{
                      padding: '10px 14px',
                      color: isTranslation ? colors.text : colors.textSecondary,
                      fontWeight: isAnchor || isTranslation ? 600 : 400,
                      whiteSpace: isAnchor ? 'nowrap' : 'normal',
                      verticalAlign: 'top',
                      lineHeight: 1.5,
                      minWidth: isAnchor ? 110 : 180,
                    }}
                  >
                    {row[columnIndex] || '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

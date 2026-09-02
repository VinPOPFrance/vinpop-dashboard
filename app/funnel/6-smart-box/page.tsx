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
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedSmartBoxConversion, rangeCacheArgs } from '@/lib/cachedDb';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 6 du funnel : conversion vers la Smart Wine Box et controle zero-Dislike.
 *
 * Le controle zero-Dislike est le point critique de cette page : aucune
 * bouteille deja rejetee par un client ne doit repartir chez lui. Voir
 * `getSmartBoxConversion` pour la regle exacte, qui distingue une note posee
 * APRES reception (normal) d une note anterieure a l expedition (erreur).
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[5];

type ConvertedRow = {
  customer: string;
  tasteKitOrderDate: string | null;
  smartBoxOrderDate: string | null;
  daysToConvert: number | null;
  ratingsCount: number;
  loveCount: number;
  likeCount: number;
  dislikeCount: number;
  positiveRate: number | null;
};

const convertedColumns: DataTableColumn<ConvertedRow>[] = [
  { key: 'customer', label: 'Client', type: 'text', strong: true, width: 220 },
  { key: 'tasteKitOrderDate', label: 'Taste Kit', type: 'date' },
  { key: 'smartBoxOrderDate', label: 'Smart Box', type: 'date' },
  { key: 'daysToConvert', label: 'Delai (jours)', type: 'number' },
  { key: 'ratingsCount', label: 'Vins notes', type: 'number' },
  {
    key: 'positiveRate',
    label: 'Concordance',
    type: 'percent',
    description: 'Part de Love + Like dans les notes du client : a quel point la box lui correspond.',
  },
  { key: 'loveCount', label: 'Love', type: 'number' },
  { key: 'likeCount', label: 'Like', type: 'number' },
  { key: 'dislikeCount', label: 'Dislike', type: 'number' },
];

export default async function Step6Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

  const result = await timeAsync(
    'page:/funnel/6-smart-box getSmartBoxConversion',
    () => getCachedSmartBoxConversion(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Conversion Smart Wine Box" subtitle="Du Taste Kit a l abonnement" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees Smart Box indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'Le croisement commandes / notes a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;
  const hasViolations = metrics.dislikeViolations.length > 0;

  const convertedRows: ConvertedRow[] = metrics.customers.map((customer) => ({
    customer: customer.customerEmail || customer.customerKey,
    tasteKitOrderDate: customer.tasteKitOrderDate,
    smartBoxOrderDate: customer.smartBoxOrderDate,
    daysToConvert: customer.daysToConvert,
    ratingsCount: customer.ratingsCount,
    loveCount: customer.loveCount,
    likeCount: customer.likeCount,
    dislikeCount: customer.dislikeCount,
    positiveRate: customer.positiveRate,
  }));

  return (
    <DashboardLayout>
      <TopBar
        title="Conversion Smart Wine Box"
        subtitle="Le passage du Taste Kit a l abonnement, et le controle zero erreur"
        step={STEP.step}
        showDateRange={false}
      />

      {/* Controle zero-Dislike : le bloc le plus important de la page */}
      <PageSection>
        {hasViolations ? (
          <AlertBanner
            tone="critical"
            title={`ALERTE — ${metrics.dislikeViolations.length} bouteille(s) expediee(s) alors qu elles etaient deja notees Dislike`}
          >
            {metrics.dislikeViolations
              .slice(0, 5)
              .map(
                (row) =>
                  `${row.wineTitle} vers ${row.customerEmail ?? row.customerKey} (commande du ${formatDate(row.orderDate)}, note du ${formatDate(row.ratingDate)})`,
              )
              .join(' · ')}
          </AlertBanner>
        ) : (
          <AlertBanner
            tone="good"
            title="Controle zero-Dislike : aucune violation detectee"
          >
            Aucun vin deja note Dislike n a ete expedie a son client.{' '}
            {formatNumber(metrics.dislikeChecksPerformed)} correspondance(s) examinee(s), dont{' '}
            {formatNumber(metrics.dislikeUnknownDate.length)} sans date de note exploitable.
          </AlertBanner>
        )}
      </PageSection>

      {metrics.dislikeUnknownDate.length > 0 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${metrics.dislikeUnknownDate.length} correspondance(s) a verifier manuellement`}
          >
            Ces vins notes Dislike apparaissent dans une commande du meme client, mais{' '}
            <code>public.ratings.created_at</code> est vide : impossible de savoir si la note precede ou
            suit l expedition. Le controle ne peut pas trancher, il ne les compte donc pas comme des
            violations.{' '}
            {metrics.dislikeUnknownDate
              .slice(0, 4)
              .map((row) => `${row.wineTitle} (${row.customerEmail ?? row.customerKey})`)
              .join(' · ')}
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Conversion Taste Kit vers Smart Box"
            value={formatPercent(metrics.conversionRate)}
            tone={metrics.conversionRate !== null && metrics.conversionRate > 0 ? 'good' : 'critical'}
            hint={`${formatNumber(metrics.convertedCustomers)} convertis sur ${formatNumber(metrics.tasteKitCustomers)} clients Taste Kit`}
          />
          <StatCard label="Clients Taste Kit" value={formatNumber(metrics.tasteKitCustomers)} />
          <StatCard
            label="Clients Smart Box"
            value={formatNumber(metrics.smartBoxCustomers)}
            tone={metrics.smartBoxCustomers === 0 ? 'critical' : 'good'}
          />
          <StatCard
            label="Delai median de conversion"
            value={metrics.medianDaysToConvert !== null ? `${formatNumber(metrics.medianDaysToConvert)} j` : 'Aucune conversion'}
          />
          <StatCard label="Commandes Smart Box" value={formatNumber(metrics.smartBoxOrders)} />
          <StatCard
            label="Controle zero-Dislike"
            value={hasViolations ? `${metrics.dislikeViolations.length} violation(s)` : 'Conforme'}
            tone={hasViolations ? 'critical' : 'good'}
            badge={<StatusBadge status={hasViolations ? 'critical' : 'good'} label={hasViolations ? 'Bloquant' : 'OK'} />}
          />
        </StatGrid>
      </PageSection>

      {/* Le cas ou le produit existe mais ne se vend pas */}
      {metrics.smartBoxCustomers === 0 && metrics.smartBoxProductsInCatalogue > 0 ? (
        <PageSection>
          <AlertBanner
            tone="critical"
            title={`${metrics.smartBoxProductsInCatalogue} produits Smart Box actifs au catalogue, zero commande`}
          >
            La Smart Wine Box est en vente mais n a jamais ete achetee. Ce n est pas un probleme de taux de
            conversion : c est le chemin d achat lui-meme qui ne fonctionne pas. A rapprocher de
            l etape 4, ou la fiche &laquo; Smart wine box &raquo; enregistre des vues sans aucun ajout au
            panier. Tant que ce point n est pas leve, les etapes 6 et 7 resteront a zero.
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Comment fonctionne le controle zero-Dislike.</strong>{' '}
            Trouver un vin note &laquo; Dislike &raquo; dans une commande ne suffit pas a conclure : dans le
            modele VinPop, le client note precisement les bouteilles qu il vient de recevoir, donc la
            plupart de ces correspondances sont normales. La faute, c est d expedier un vin{' '}
            <strong>deja rejete</strong>. Le controle compare donc la date de la note a celle de la
            commande, et ne retient comme violation que les notes anterieures. Les correspondances sans
            date exploitable sont listees a part, jamais melangees aux violations.
          </p>
        </Card>
      </PageSection>

      <Section
        title="Clients convertis a la Smart Box"
        sub="Profil aromatique de chacun : la concordance mesure la part de Love et Like dans ses notes."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={convertedColumns}
            rows={convertedRows}
            initialSortKey="smartBoxOrderDate"
            searchPlaceholder="Filtrer un client..."
            emptyMessage="Aucun client n a encore commande de Smart Wine Box."
            rowKey="customer"
          />
        </Card>
      </Section>
    </DashboardLayout>
  );
}

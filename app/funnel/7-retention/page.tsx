import { Suspense } from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FunnelPipelineBar, FunnelPipelineBarSkeleton } from '@/components/funnel/FunnelPipelineBar';
import { TopBar } from '@/components/TopBar';
import {
  AlertBanner,
  Card,
  DataTable,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  colors,
  type DataTableColumn,
} from '@/components/ui';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getCachedChurnRisk, rangeCacheArgs } from '@/lib/cachedDb';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 7 du funnel : recurrence, valeur vie client et churn.
 *
 * S appuie sur les CTE de commandes reparees au Lot 3bis. Le retard de chaque
 * client se mesure par rapport a la commande la plus recente de l entrepot, pas
 * a la date du jour : voir `getChurnRisk`.
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[6];

type ChurnRow = {
  customer: string;
  ordersCount: number;
  revenue: number;
  lastOrderDate: string | null;
  averageIntervalDays: number | null;
  daysSinceLastOrder: number | null;
  overdueRatio: number | null;
  status: string;
};

const churnColumns: DataTableColumn<ChurnRow>[] = [
  { key: 'customer', label: 'Client', type: 'text', strong: true, width: 220 },
  { key: 'ordersCount', label: 'Commandes', type: 'number' },
  { key: 'revenue', label: 'CA cumule', type: 'money' },
  { key: 'lastOrderDate', label: 'Derniere commande', type: 'date' },
  {
    key: 'averageIntervalDays',
    label: 'Rythme (j)',
    type: 'number',
    description: 'Intervalle moyen entre deux commandes de ce client.',
  },
  { key: 'daysSinceLastOrder', label: 'Silence (j)', type: 'number' },
  {
    key: 'overdueRatio',
    label: 'Retard',
    type: 'number',
    tone: 'warning',
    description: 'Silence divise par le rythme habituel. Au-dela de 1, le client est en retard.',
  },
  { key: 'status', label: 'Etat', type: 'text' },
];

export default async function Step7Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const range = getDateRangeFromSearchParams(params);

  const result = await timeAsync(
    'page:/funnel/7-retention getChurnRisk',
    () => getCachedChurnRisk(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Recurrence & LTV" subtitle="Ce que rapporte un client dans la duree" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees de retention indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La lecture des commandes a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;

  // Seuls les clients ayant un rythme etabli sont affiches : un client a une
  // seule commande n a pas de retard mesurable.
  const rows: ChurnRow[] = metrics.customers
    .filter((customer) => customer.ordersCount > 1)
    .map((customer) => ({
      customer: customer.customerEmail || customer.customerKey,
      ordersCount: customer.ordersCount,
      revenue: customer.revenue,
      lastOrderDate: customer.lastOrderDate,
      averageIntervalDays: customer.averageIntervalDays,
      daysSinceLastOrder: customer.daysSinceLastOrder,
      overdueRatio: customer.overdueRatio,
      status: customer.atRisk ? 'A risque' : 'Dans son rythme',
    }));

  return (
    <DashboardLayout>
      <TopBar
        title="Recurrence & LTV"
        subtitle="Ce que rapporte un client dans la duree, et qui est en train de partir"
        step={STEP.step}
        showDateRange={false}
      />

      {/* La bande des 7 etapes lit sept sources : elle ne doit jamais retarder
          le contenu de la page, qui n en lit qu une. */}
      <Suspense fallback={<FunnelPipelineBarSkeleton />}>
        <FunnelPipelineBar currentStep={STEP.step} searchParams={params} />
      </Suspense>

      {metrics.atRiskCustomers.length > 0 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${metrics.atRiskCustomers.length} client(s) sorti(s) de leur rythme — ${formatEuro(metrics.revenueAtRisk)} de CA historique concerne`}
          >
            {metrics.atRiskCustomers
              .slice(0, 4)
              .map(
                (customer) =>
                  `${customer.customerEmail ?? customer.customerKey} (${formatNumber(customer.daysSinceLastOrder)} j de silence pour un rythme de ${formatNumber(customer.averageIntervalDays)} j)`,
              )
              .join(' · ')}
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Taux de recurrence"
            value={formatPercent(metrics.repeatRate)}
            tone={metrics.repeatRate !== null && metrics.repeatRate < 20 ? 'warning' : 'good'}
            hint={`${formatNumber(metrics.repeatCustomers)} clients sur ${formatNumber(metrics.orderingCustomers)} ont recommande`}
          />
          <StatCard
            label="Frequence d achat"
            value={
              metrics.averagePurchaseIntervalDays !== null
                ? `${formatNumber(metrics.averagePurchaseIntervalDays)} j`
                : 'Pas encore mesurable'
            }
            hint="Intervalle moyen entre deux commandes d un meme client"
          />
          <StatCard
            label="Valeur vie client"
            value={formatEuro(metrics.lifetimeValue)}
            hint="Chiffre d affaires moyen par client, a ce jour"
          />
          <StatCard
            label="LTV des clients recurrents"
            value={formatEuro(metrics.repeatLifetimeValue)}
            tone="good"
            hint="Ce que vaut un client qui recommande"
          />
          <StatCard
            label="Commandes par client"
            value={formatNumber(metrics.averageOrdersPerCustomer, 2)}
          />
          <StatCard
            label="Clients a risque"
            value={formatNumber(metrics.atRiskCustomers.length)}
            tone={metrics.atRiskCustomers.length > 0 ? 'warning' : 'good'}
            hint={`Silence superieur a ${metrics.churnOverdueFactor} fois leur rythme habituel`}
          />
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Le retard se mesure depuis la derniere commande
            connue, pas depuis aujourd hui.</strong> Les commandes arrivent par synchronisation Airbyte ;
            si la synchronisation prend du retard, compter les jours depuis la date du jour ferait
            apparaitre tous les clients comme perdus alors qu il ne manque que des donnees. La date de
            reference est donc la commande la plus recente de l entrepot
            {metrics.referenceDate ? ` (${new Date(metrics.referenceDate).toLocaleDateString('fr-FR')})` : ''}
            {metrics.dataLagDays !== null && metrics.dataLagDays > 2
              ? `, soit ${formatNumber(metrics.dataLagDays)} jours de retard sur aujourd hui.`
              : '.'}{' '}
            Le rythme de chaque client vient de son propre historique : (derniere commande - premiere
            commande) divise par (nombre de commandes - 1). Un client a une seule commande n a pas de
            rythme et n est donc jamais compte comme perdu.
          </p>
        </Card>
      </PageSection>

      <Section
        title="Clients recurrents et risque de churn"
        sub="Uniquement les clients ayant commande au moins deux fois : ce sont les seuls a avoir un rythme mesurable."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={churnColumns}
            rows={rows}
            initialSortKey="overdueRatio"
            searchPlaceholder="Filtrer un client..."
            emptyMessage="Aucun client recurrent : personne n a encore commande deux fois."
            rowKey="customer"
          />
        </Card>
      </Section>
    </DashboardLayout>
  );
}

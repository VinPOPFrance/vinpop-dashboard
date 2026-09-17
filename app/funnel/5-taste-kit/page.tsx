import { Suspense } from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { CustomerRatingsSplitView } from '@/components/funnel/CustomerRatingsSplitView';
import { FunnelPipelineBar, FunnelPipelineBarSkeleton } from '@/components/funnel/FunnelPipelineBar';
import {
  AlertBanner,
  Card,
  PageSection,
  Section,
  StatCard,
  StatGrid,
  colors,
  type DataTableColumn,
} from '@/components/ui';
import { getCachedRatingsIntelligence } from '@/lib/cachedDb';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 5 du funnel : Taste Kit et pipeline de notation.
 *
 * Aucune requete nouvelle : `getRatingsIntelligence` calcule deja, par client,
 * les bouteilles achetees, celles notees et celles qui restent a evaluer.
 * Cette page en fait une liste de relance actionnable.
 *
 * Les chiffres sont cumules, pas filtres sur la periode : la question posee est
 * "qui doit encore noter ses vins aujourd hui", pas "combien de notes ce mois-ci".
 * Une bonne partie des lignes de `public.ratings` n a d ailleurs pas de date,
 * ce qui rendrait tout filtrage temporel faux.
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[4];

/**
 * Une ligne du pipeline de relance.
 *
 * Les compteurs Love / Like / Dislike ne figurent plus ici : le panneau de
 * droite du split view les detaille vin par vin, ce qui est la seule lecture
 * actionnable ("laquelle de ses bouteilles reste a noter ?").
 */
type PipelineRow = {
  clientLabel: string;
  customerIdentifier: string;
  tasteKit: string;
  bottlesBought: number;
  bottlesRated: number;
  remaining: number;
  noteStatus: string;
  ratedPercentage: number | null;
  lastRatingDate: string | null;
  nextAction: string;
};

const pipelineColumns: DataTableColumn<PipelineRow>[] = [
  { key: 'clientLabel', label: 'Client', type: 'text', strong: true, width: 220 },
  { key: 'tasteKit', label: 'Taste Kit', type: 'text' },
  { key: 'bottlesBought', label: 'Bouteilles recues', type: 'number' },
  { key: 'bottlesRated', label: 'Notees', type: 'number' },
  {
    key: 'remaining',
    label: 'Restant a noter',
    type: 'number',
    tone: 'warning',
    description: 'Bouteilles achetees et pas encore evaluees. C est le volume de relance.',
  },
  { key: 'noteStatus', label: 'Statut notes', type: 'text' },
  { key: 'ratedPercentage', label: 'Avancement', type: 'percent' },
  { key: 'lastRatingDate', label: 'Derniere note', type: 'date' },
  { key: 'nextAction', label: 'Action', type: 'text' },
];

function formatCustomerLabel(identifier: string) {
  if (identifier.includes('@')) return identifier;
  return `Client Shopify ${identifier.replace(/^order:/, '')}`;
}

export default async function Step5Page() {
  await connection();

  const result = await timeAsync(
    'page:/funnel/5-taste-kit getRatingsIntelligence',
    () => getCachedRatingsIntelligence(),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Taste Kit & notation" subtitle="Qui a note ses vins, qui doit etre relance" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees de notation indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La lecture des tables de notation a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;

  // La vue inclut tous les clients ayant recu des bouteilles. Les clients qui
  // ont encore des notes a donner restent en tete du tableau.
  const pipeline = metrics.customers
    .filter((customer) => customer.startupPackBuyer && customer.bottlesBought > 0)
    .sort(
      (a, b) =>
        b.unratedBottlesRemaining - a.unratedBottlesRemaining ||
        (b.lastRatingDate ?? '').localeCompare(a.lastRatingDate ?? ''),
    );

  const pipelineRows: PipelineRow[] = pipeline.map((customer) => {
    const customerIdentifier = customer.email || customer.customerId;

    return {
      clientLabel: formatCustomerLabel(customerIdentifier),
      customerIdentifier,
      tasteKit: customer.startupPackBuyer ? 'Yes' : 'No',
      bottlesBought: customer.bottlesBought,
      bottlesRated: customer.bottlesRated,
      remaining: customer.unratedBottlesRemaining,
      noteStatus: customer.unratedBottlesRemaining > 0 ? 'Notes manquantes' : 'Notes completes',
      ratedPercentage: customer.ratedPercentage,
      lastRatingDate: customer.lastRatingDate,
      nextAction: customer.nextAction,
    };
  });

  // Clients ayant achete un coffret de decouverte : la population de reference
  // du taux de demarrage de notation.
  const tasteKitCustomers = metrics.customers.filter((customer) => customer.startupPackBuyer);
  const tasteKitStartedRating = tasteKitCustomers.filter((customer) => customer.bottlesRated > 0);
  const startedRatingRate = tasteKitCustomers.length
    ? (tasteKitStartedRating.length / tasteKitCustomers.length) * 100
    : null;

  const pendingCustomers = pipeline.filter((customer) => customer.unratedBottlesRemaining > 0);
  const bottlesToRate = pendingCustomers.reduce((sum, customer) => sum + customer.unratedBottlesRemaining, 0);

  return (
    <DashboardLayout>
      <TopBar
        title="Taste Kit & notation des vins"
        subtitle="Qui a note ses vins, qui doit etre relance, et ce que disent les notes"
        step={STEP.step}
        showDateRange={false}
      />

      {/* La bande des 7 etapes ne doit jamais retarder le contenu de la page :
          elle lit sept sources, la page n en lit qu une. */}
      <Suspense fallback={<FunnelPipelineBarSkeleton />}>
        <FunnelPipelineBar currentStep={STEP.step} />
      </Suspense>

      {pendingCustomers.length > 0 ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${pendingCustomers.length} client(s) a relancer — ${formatNumber(bottlesToRate)} bouteilles en attente de notation`}
          >
            Sans ces notes, l algorithme de recommandation travaille a l aveugle pour ces clients :
            la Smart Wine Box de l etape 6 ne peut pas etre composee correctement.
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Clients Taste Kit ayant commence a noter"
            value={formatPercent(startedRatingRate)}
            tone={startedRatingRate !== null && startedRatingRate < 50 ? 'warning' : 'good'}
            hint={`${formatNumber(tasteKitStartedRating.length)} sur ${formatNumber(tasteKitCustomers.length)} acheteurs de coffret`}
          />
          <StatCard
            label="Notes recoltees"
            value={formatNumber(metrics.totalRatings)}
            hint={`${formatNumber(metrics.usersWithRatings)} clients ont note au moins un vin`}
          />
          <StatCard
            label="Love"
            value={formatNumber(metrics.loveCount)}
            tone="good"
            hint={formatPercent(metrics.loveRate)}
          />
          <StatCard label="Like" value={formatNumber(metrics.likeCount)} hint={formatPercent(metrics.likeRate)} />
          <StatCard
            label="Dislike"
            value={formatNumber(metrics.dislikeCount)}
            tone={metrics.dislikeCount > 0 ? 'warning' : 'default'}
            hint={`${formatPercent(metrics.dislikeRate)} — a exclure des prochaines box`}
          />
          <StatCard
            label="Bouteilles en attente"
            value={formatNumber(bottlesToRate)}
            tone={bottlesToRate > 0 ? 'warning' : 'good'}
            hint={`Reparties sur ${formatNumber(pendingCustomers.length)} clients a relancer`}
          />
        </StatGrid>
      </PageSection>

      <PageSection>
        <Card style={{ background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Lecture cumulee, pas periodique.</strong> Cette etape
            repond a la question &laquo; qui doit encore noter ses vins &raquo;, qui n a pas de bornes de
            dates. C est aussi la seule lecture correcte ici : une partie des lignes de{' '}
            <code>public.ratings</code> n a pas de date de creation, un filtrage temporel les ferait
            disparaitre du pipeline alors que ces bouteilles restent bel et bien a noter. Le selecteur de
            periode est donc masque sur cette page.
          </p>
        </Card>
      </PageSection>

      <Section
        title="Pipeline de relance"
        sub="Tous les clients ayant recu des bouteilles, classes par volume restant a noter. Cliquer une ligne affiche le detail de ses bouteilles a droite."
        bare
      >
        <CustomerRatingsSplitView
          columns={pipelineColumns}
          rows={pipelineRows}
          identifierKey="customerIdentifier"
          initialSortKey="lastRatingDate"
          initialSortDirection="desc"
          emptyMessage="Aucun client en attente de notation : tout le monde est a jour."
        />
      </Section>

      {metrics.missingData.length > 0 ? (
        <PageSection>
          <Card>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: colors.text }}>
              Limites des donnees actuelles
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.8 }}>
              {metrics.missingData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </PageSection>
      ) : null}
    </DashboardLayout>
  );
}

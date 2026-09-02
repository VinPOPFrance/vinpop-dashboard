import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
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
import { getCachedQuizFunnel, rangeCacheArgs } from '@/lib/cachedDb';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';
import type { QuizFunnelSegment } from '@/lib/db';

/**
 * Etape 3 du funnel : le quiz.
 *
 * Une question : combien de visiteurs commencent le quiz, et combien vont au
 * bout ? La mesure porte sur des sessions distinctes issues de
 * `public.site_events`, pas sur des evenements bruts.
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[2];

type SegmentRow = {
  label: string;
  startedSessions: number;
  completedSessions: number;
  completionRate: number | null;
  dropOffRate: number | null;
};

const segmentColumns: DataTableColumn<SegmentRow>[] = [
  { key: 'label', label: 'Segment', type: 'text', strong: true, width: 260 },
  { key: 'startedSessions', label: 'Quiz demarres', type: 'number' },
  { key: 'completedSessions', label: 'Quiz termines', type: 'number' },
  { key: 'completionRate', label: 'Completion', type: 'percent' },
  {
    key: 'dropOffRate',
    label: 'Abandon',
    type: 'percent',
    tone: 'warning',
    description: 'Part des sessions qui demarrent le quiz sans le terminer.',
  },
];

/** Convertit un segment du domaine en ligne de tableau. */
function toRows(segments: QuizFunnelSegment[]): SegmentRow[] {
  return segments.map((segment) => ({
    label: segment.label,
    startedSessions: segment.startedSessions,
    completedSessions: segment.completedSessions,
    completionRate: segment.completionRate,
    dropOffRate: segment.dropOffRate,
  }));
}

export default async function Step3Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

  const result = await timeAsync(
    'page:/funnel/3-quiz getQuizFunnel',
    () => getCachedQuizFunnel(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="Funnel du quiz" subtitle="Quiz demarres contre quiz termines" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees du quiz indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La lecture de public.site_events a echoue.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;
  const dropOffAlert =
    metrics.dropOffRate !== null && metrics.dropOffRate > metrics.dropOffAlertThreshold;

  // Segments qui decrochent nettement plus que la moyenne : c est la que se
  // trouve le probleme, pas dans la moyenne globale.
  const worstSegments = [...metrics.byEntryPage]
    .filter((segment) => segment.startedSessions >= 10 && segment.dropOffRate !== null)
    .sort((a, b) => (b.dropOffRate ?? 0) - (a.dropOffRate ?? 0))
    .slice(0, 3);

  return (
    <DashboardLayout>
      <TopBar
        title="Funnel du quiz"
        subtitle="Combien de visiteurs commencent le quiz, combien le terminent"
        step={STEP.step}
      />

      {/* Alerte principale : le seuil d abandon de 80 % */}
      <PageSection>
        {dropOffAlert ? (
          <AlertBanner
            tone="critical"
            title={`Abandon du quiz a ${formatPercent(metrics.dropOffRate)} — au-dessus du seuil de ${metrics.dropOffAlertThreshold} %`}
          >
            {formatNumber(metrics.startedSessions - metrics.completedSessions)} sessions ont demarre le quiz
            sans le terminer sur la periode. A traiter en priorite : tout le reste du funnel en depend.
          </AlertBanner>
        ) : (
          <AlertBanner
            tone="good"
            title={`Abandon a ${formatPercent(metrics.dropOffRate)} — sous le seuil d alerte de ${metrics.dropOffAlertThreshold} %`}
          >
            Le quiz n est pas le point de blocage sur cette periode. Le goulot est ailleurs dans le funnel.
          </AlertBanner>
        )}
      </PageSection>

      <PageSection>
        <StatGrid>
          <StatCard
            label="Quiz demarres"
            value={formatNumber(metrics.startedSessions)}
            hint={`${formatNumber(metrics.startedVisitors)} visiteurs distincts · ${metrics.periodLabel}`}
          />
          <StatCard label="Quiz termines" value={formatNumber(metrics.completedSessions)} />
          <StatCard
            label="Taux de completion"
            value={formatPercent(metrics.completionRate)}
            tone={dropOffAlert ? 'warning' : 'good'}
          />
          <StatCard
            label="Taux d abandon"
            value={formatPercent(metrics.dropOffRate)}
            tone={dropOffAlert ? 'critical' : 'good'}
            hint={`Seuil d alerte : ${metrics.dropOffAlertThreshold} %`}
          />
        </StatGrid>
      </PageSection>

      {/* Coherence entre les evenements du site et les resultats persistes */}
      {metrics.completedSessions > 0 && metrics.storedQuizResults < metrics.completedSessions ? (
        <PageSection>
          <AlertBanner
            tone="warning"
            title={`${formatNumber(metrics.completedSessions)} quiz termines mais ${formatNumber(metrics.storedQuizResults)} resultat(s) enregistre(s) en base`}
          >
            Les evenements du site et la table <code>public.quizz</code> ne concordent pas. Deux causes
            possibles : les reponses ne sont pas persistees, ou la synchronisation Airbyte de cette table
            accuse du retard. A verifier avant de s appuyer sur les profils de gout des etapes 5 et 6.
          </AlertBanner>
        </PageSection>
      ) : null}

      <PageSection>
        <ChartFrame
          title="Demarrages et completions par jour"
          sub={metrics.periodLabel}
          height={190}
          isEmpty={metrics.daily.length === 0}
          emptyMessage="Aucun evenement de quiz sur la periode selectionnee."
        >
          <BarChart
            data={metrics.daily.map((point) => ({
              label: point.date,
              value: point.startedSessions,
              color: colors.brand,
            }))}
            format="number"
          />
        </ChartFrame>
      </PageSection>

      {worstSegments.length > 0 ? (
        <Section
          title="Ou l abandon est le plus fort"
          sub="Pages d entree ayant au moins 10 quiz demarres, classees par taux d abandon."
          bare
        >
          <StatGrid min={240}>
            {worstSegments.map((segment) => (
              <StatCard
                key={segment.label}
                label={segment.label}
                value={formatPercent(segment.dropOffRate)}
                tone={
                  segment.dropOffRate !== null && segment.dropOffRate > metrics.dropOffAlertThreshold
                    ? 'critical'
                    : 'default'
                }
                hint={`${formatNumber(segment.startedSessions)} demarres · ${formatNumber(segment.completedSessions)} termines`}
              />
            ))}
          </StatGrid>
        </Section>
      ) : null}

      <Section
        title="Decomposition par type de quiz"
        sub="Chaque parcours de quiz a son propre taux d abandon."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={segmentColumns}
            rows={toRows(metrics.byQuizType)}
            initialSortKey="startedSessions"
            enableSearch={false}
            emptyMessage="Aucun type de quiz sur la periode."
            rowKey="label"
          />
        </Card>
      </Section>

      <Section
        title="Decomposition par page d entree"
        sub="La page depuis laquelle le quiz a ete lance."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={segmentColumns}
            rows={toRows(metrics.byEntryPage)}
            initialSortKey="startedSessions"
            searchPlaceholder="Filtrer une page..."
            emptyMessage="Aucune page d entree identifiee."
            rowKey="label"
          />
        </Card>
      </Section>

      <Section
        title="Decomposition par source de trafic"
        sub="Le canal qui a amene le visiteur, d apres les parametres UTM."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={segmentColumns}
            rows={toRows(metrics.bySource)}
            initialSortKey="startedSessions"
            enableSearch={false}
            emptyMessage="Aucune source identifiee."
            rowKey="label"
          />
        </Card>
      </Section>

      {/* Limite assumee : la granularite par question n existe pas encore */}
      {!metrics.perQuestionAvailable ? (
        <PageSection>
          <Card style={{ background: colors.surfaceMuted }}>
            <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
              <strong style={{ color: colors.text }}>Pas encore de decomposition question par question.</strong>{' '}
              Le site emet deux evenements, <code>vinpop_quiz_started</code> et
              {' '}<code>vinpop_quiz_completed</code>, dont le payload ne contient que le type de quiz : rien
              n indique la question atteinte avant l abandon. Les decompositions ci-dessus (type, page
              d entree, source) sont les axes disponibles aujourd hui. Pour descendre a la question, il
              faudra emettre un evenement par etape depuis le theme Shopify — la route
              {' '}<code>/api/events</code> est deja en place pour le recevoir.
            </p>
          </Card>
        </PageSection>
      ) : null}
    </DashboardLayout>
  );
}

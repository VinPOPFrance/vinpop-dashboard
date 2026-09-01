import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ExperiencePagesTable } from '@/components/funnel/ExperiencePagesTable';
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
import { getCachedSiteExperience, rangeCacheArgs } from '@/lib/cachedDb';
import { buildClarityLinks, getClarityProjectId } from '@/lib/clarity';
import { FUNNEL_STEPS } from '@/lib/navigation';
import { formatNumber, formatPercent } from '@/lib/format';
import { timeAsync } from '@/lib/performance';

/**
 * Etape 1 du funnel : experience et rebond sur le site.
 *
 * Repond a une seule question : ou les visiteurs partent-ils avant d avoir
 * commence le parcours ? Deux niveaux de lecture, volontairement distincts :
 * le taux de rebond GA4 par source (donnee native) et l engagement par page
 * (seul signal disponible a la maille page, voir le bloc d avertissement).
 */

export const runtime = 'nodejs';

const STEP = FUNNEL_STEPS[0];

type SourceRow = {
  sourceMedium: string;
  sessions: number;
  bounceRate: number | null;
  pageViews: number;
  averageSessionDuration: number | null;
};

const sourceColumns: DataTableColumn<SourceRow>[] = [
  { key: 'sourceMedium', label: 'Source / support', type: 'text', strong: true },
  { key: 'sessions', label: 'Sessions', type: 'number' },
  {
    key: 'bounceRate',
    label: 'Taux de rebond',
    type: 'percent',
    description: 'Taux de rebond GA4, pondere par les sessions. Vide si moins de 5 sessions.',
  },
  { key: 'pageViews', label: 'Pages vues', type: 'number' },
  { key: 'averageSessionDuration', label: 'Duree moy. (s)', type: 'number' },
];

export default async function Step1Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const range = getDateRangeFromSearchParams(await searchParams);

  const result = await timeAsync(
    'page:/funnel/1-experience getSiteExperience',
    () => getCachedSiteExperience(...rangeCacheArgs(range)),
    { category: 'page', cacheStatus: 'unknown' },
  );

  if (!result.ok) {
    return (
      <DashboardLayout>
        <TopBar title="UX & Rebond" subtitle="Ou les visiteurs abandonnent avant de commencer" step={STEP.step} />
        <PageSection>
          <AlertBanner tone="critical" title="Donnees GA4 indisponibles">
            {result.reason === 'missing-url'
              ? 'DATABASE_URL n est pas configure.'
              : 'La connexion a la base a echoue. Voir Data Quality pour le detail.'}
          </AlertBanner>
        </PageSection>
      </DashboardLayout>
    );
  }

  const metrics = result.metrics;
  const clarityConfigured = getClarityProjectId() !== null;

  const sourceRows: SourceRow[] = metrics.sources.map((source) => ({
    sourceMedium: source.sourceMedium,
    sessions: source.sessions,
    bounceRate: source.bounceRate,
    pageViews: source.screenPageViews,
    averageSessionDuration: source.averageSessionDuration,
  }));

  // Pages triees par volume : une page peu vue et peu engageante ne merite pas
  // qu on lui consacre la journee.
  const lowEngagementPages = metrics.pages
    .filter((page) => page.lowEngagement)
    .sort((a, b) => b.screenPageViews - a.screenPageViews)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <TopBar
        title="UX & Rebond"
        subtitle="Ou les visiteurs abandonnent avant meme de commencer le parcours"
        step={STEP.step}
      />

      {/* Alertes en haut : ce qui demande une action aujourd hui */}
      {metrics.highBounceSources.length > 0 || lowEngagementPages.length > 0 ? (
        <PageSection>
          <div style={{ display: 'grid', gap: 10 }}>
            {metrics.highBounceSources.length > 0 ? (
              <AlertBanner
                tone="warning"
                title={`${metrics.highBounceSources.length} source(s) au-dessus de ${metrics.bounceAlertThreshold} % de rebond`}
              >
                {metrics.highBounceSources
                  .slice(0, 4)
                  .map((source) => `${source.sourceMedium} (${formatPercent(source.bounceRate)}, ${formatNumber(source.sessions)} sessions)`)
                  .join(' · ')}
              </AlertBanner>
            ) : null}

            {lowEngagementPages.length > 0 ? (
              <AlertBanner
                tone="warning"
                title={`${lowEngagementPages.length} page(s) sous ${metrics.engagementAlertThresholdSeconds} s d engagement par vue`}
              >
                {lowEngagementPages
                  .map((page) => `${page.pagePath} (${formatNumber(page.engagementSecondsPerView, 1)} s)`)
                  .join(' · ')}
              </AlertBanner>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      <PageSection>
        <StatGrid>
          <StatCard
            label="Taux de rebond global"
            value={formatPercent(metrics.bounceRate)}
            tone={metrics.bounceRate !== null && metrics.bounceRate > metrics.bounceAlertThreshold ? 'warning' : 'good'}
            hint={`Seuil d alerte : ${metrics.bounceAlertThreshold} %. Pondere par les sessions.`}
          />
          <StatCard label="Sessions" value={formatNumber(metrics.totalSessions)} hint={metrics.periodLabel} />
          <StatCard label="Pages vues" value={formatNumber(metrics.totalPageViews)} />
          <StatCard
            label="Duree moyenne de session"
            value={metrics.averageSessionDuration !== null ? `${formatNumber(metrics.averageSessionDuration)} s` : 'Indisponible'}
          />
        </StatGrid>
      </PageSection>

      <Section
        title="Taux de rebond par source de trafic"
        sub="Donnee GA4 native (table traffic_sources). C est ici que le rebond est mesure, pas estime."
        bare
      >
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            columns={sourceColumns}
            rows={sourceRows}
            initialSortKey="sessions"
            searchPlaceholder="Filtrer une source..."
            emptyMessage="Aucune session GA4 sur la periode."
            rowKey="sourceMedium"
          />
        </Card>
      </Section>

      <Section
        title="Engagement par page"
        sub="Les pages les plus vues, et le temps reellement passe dessus."
        bare
      >
        <Card style={{ marginBottom: 12, background: colors.surfaceMuted }}>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: colors.text }}>Pourquoi pas de taux de rebond par page ?</strong>{' '}
            La table GA4 <code>pages_path_report</code> ne contient ni sessions ni sessions engagees :
            le rebond n y est pas calculable. Le signal equivalent disponible est le temps d engagement
            par vue — une page traversee sans etre lue tombe sous {metrics.engagementAlertThresholdSeconds} s.
            {' '}Pour voir le comportement reel sur une page, ouvrir sa heatmap Clarity.
          </p>
        </Card>

        {!clarityConfigured ? (
          <Card style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: colors.textSecondary }}>
              Les liens Clarity sont masques : ajouter <code>CLARITY_PROJECT_ID</code> dans
              {' '}<code>.env.local</code> et dans les variables Vercel pour les activer.
            </p>
          </Card>
        ) : null}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ExperiencePagesTable
            rows={metrics.pages.map((page) => ({
              pagePath: page.pagePath,
              screenPageViews: page.screenPageViews,
              totalUsers: page.totalUsers,
              engagementSecondsPerView: page.engagementSecondsPerView,
              eventsPerView: page.eventsPerView,
              lowEngagement: page.lowEngagement,
              clarity: buildClarityLinks(page.pagePath),
            }))}
            engagementThresholdSeconds={metrics.engagementAlertThresholdSeconds}
          />
        </Card>
      </Section>
    </DashboardLayout>
  );
}

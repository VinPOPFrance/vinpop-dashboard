import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import {
  buildCopyVersionPeriods,
  copySurfaces,
  daysBetween,
  type CopySurface,
  type CopyVersion,
  type CopyVersionEra,
  type CopyVersionField,
  type CopyVersionPeriod,
  type CopyVersionStatus,
} from '@/data/copyVersions';
import { getCopyVersionPerformance, type CopyVersionPeriodMetrics } from '@/lib/db';
import { formatEuro, formatNumber, formatRatio } from '@/lib/format';

export const runtime = 'nodejs';

const fieldLabels: Record<CopyVersionField, string> = {
  eyebrow: 'Eyebrow',
  audience: 'Audience line',
  title: 'Headline',
  lead: 'Paragraph',
  ctaPrimary: 'Main button',
  ctaSecondary: 'Secondary link',
};

const statusStyles: Record<
  CopyVersionStatus,
  { label: string; color: string; background: string; border: string }
> = {
  live: { label: 'Live on the site', color: '#2D6A4F', background: '#EDF5F0', border: '#2D6A4F' },
  replaced: { label: 'Replaced', color: '#6B6B6B', background: '#F4F3F0', border: '#E8E6E1' },
  unpublished: { label: 'Committed, not published', color: '#B45309', background: '#FFFCF0', border: '#F2C94C' },
  'live-untracked': { label: 'Live, absent from Git', color: '#9B2C2C', background: '#FDF0F0', border: '#9B2C2C' },
};

const eraLabels: Record<CopyVersionEra, string> = {
  'theme-editor': 'Shopify theme editor',
  'landing-section': 'Custom landing section',
  'quiz-snippet': 'Quiz snippet (hardcoded)',
  'quiz-script': 'Quiz script (JavaScript)',
};

type Coverage = { covered: number; total: number; state: 'full' | 'partial' | 'none' | 'never-live' };

function toDay(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function coverageFor(
  period: CopyVersionPeriod,
  firstDataDay: string | null,
  lastDataDay: string | null,
  today: string,
): Coverage {
  if (period.liveDays === null) return { covered: 0, total: 0, state: 'never-live' };

  const total = period.liveDays;
  const periodEnd = period.end ?? today;
  if (!firstDataDay || !lastDataDay) return { covered: 0, total, state: 'none' };

  const from = firstDataDay > period.start ? firstDataDay : period.start;
  const to = lastDataDay < periodEnd ? lastDataDay : periodEnd;
  const covered = from >= to ? 0 : daysBetween(from, to);

  if (covered === 0) return { covered, total, state: 'none' };
  return { covered, total, state: covered >= total ? 'full' : 'partial' };
}

function coverageHint(coverage: Coverage, reason: string, neverLiveReason: string): string {
  if (coverage.state === 'never-live') return neverLiveReason;
  if (coverage.state === 'none') return reason;
  if (coverage.state === 'full') return 'Full period covered';
  return `Only ${coverage.covered} of ${coverage.total} days covered`;
}

function hasMeasured(coverage: Coverage): boolean {
  return coverage.state === 'full' || coverage.state === 'partial';
}

function CopyPreview({ version }: { version: CopyVersion }) {
  return (
    <div
      style={{
        background: '#FBFAF8',
        border: '1px solid #E8E6E1',
        borderRadius: 8,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {version.eyebrow ? (
        <span
          style={{
            alignSelf: 'flex-start',
            background: '#F3E7E3',
            color: '#722F37',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {version.eyebrow}
        </span>
      ) : null}

      {version.audience ? (
        <p style={{ margin: 0, fontSize: 13, color: '#9B9B9B', fontStyle: 'italic' }}>{version.audience}</p>
      ) : null}

      <h3
        style={{
          margin: 0,
          fontSize: 22,
          lineHeight: 1.2,
          fontWeight: 700,
          color: '#1A1A1A',
          letterSpacing: '-0.01em',
        }}
      >
        {version.titleBefore}
        {version.titleHighlight ? <span style={{ color: '#722F37' }}> {version.titleHighlight}</span> : null}
      </h3>

      {version.lead ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#6B6B6B', maxWidth: '68ch' }}>{version.lead}</p>
      ) : null}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
        <span
          style={{
            background: '#1A1A1A',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            padding: '7px 13px',
            borderRadius: 6,
          }}
        >
          {version.ctaPrimary}
        </span>
        {version.ctaSecondary ? (
          <span style={{ fontSize: 12, color: '#9B9B9B', textDecoration: 'underline' }}>{version.ctaSecondary}</span>
        ) : null}
      </div>
    </div>
  );
}

export default async function CopyHistoryPage() {
  await connection();

  const today = new Date().toISOString().slice(0, 10);

  const surfacePeriods = copySurfaces.map((surface) => ({
    surface,
    periods: buildCopyVersionPeriods(surface.versions, today),
  }));

  const allLivePeriods = surfacePeriods
    .flatMap((entry) => entry.periods)
    .filter((period) => period.liveDays !== null);

  const result = await getCopyVersionPerformance(
    allLivePeriods.map((period) => ({ id: period.version.id, start: period.start, end: period.end })),
  );

  const metrics = result.ok ? result.metrics : null;
  const metricsById = new Map<string, CopyVersionPeriodMetrics>(
    (metrics?.periods ?? []).map((row) => [row.id, row]),
  );

  const firstEventDay = toDay(metrics?.firstEventAt);
  const lastEventDay = toDay(metrics?.lastEventAt);
  const firstOrderDay = toDay(metrics?.firstOrderAt);
  const lastOrderDay = toDay(metrics?.lastOrderAt);
  const lastSyncDay = toDay(metrics?.lastOrderSyncAt);

  const eventsAreFresh = Boolean(lastEventDay && daysBetween(lastEventDay, today) <= 2);
  const ordersAreStale = Boolean(lastSyncDay && daysBetween(lastSyncDay, today) > 2);

  const totalVersions = copySurfaces.reduce((sum, surface) => sum + surface.versions.length, 0);
  const untrackedSurfaces = copySurfaces.filter((surface) =>
    surface.versions.some((version) => version.status === 'live-untracked'),
  );
  const unpublishedCount = copySurfaces.reduce(
    (sum, surface) => sum + surface.versions.filter((version) => version.status === 'unpublished').length,
    0,
  );

  return (
    <DashboardLayout>
      <TopBar
        title="Copy History"
        subtitle="Every headline VinPop has run on its three key screens, newest first, with what the data says about each."
      />

      <PageSection>
        <SectionTitle sub="Reconstructed from 208 commits of the Shopify theme repository">
          Coverage
        </SectionTitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <MetricCard label="Screens tracked" value={formatNumber(copySurfaces.length)} hint="Homepage, quiz intro, results" />
          <MetricCard label="Versions found" value={formatNumber(totalVersions)} hint="Since 18 November 2025" />
          <MetricCard
            label="Live but absent from Git"
            value={formatNumber(untrackedSurfaces.length)}
            hint={untrackedSurfaces.length > 0 ? 'Edited straight in Shopify, never committed' : undefined}
            tone={untrackedSurfaces.length > 0 ? 'warning' : 'good'}
          />
          <MetricCard
            label="Committed, not published"
            value={formatNumber(unpublishedCount)}
            hint={unpublishedCount > 0 ? 'Written in Git but not on the live theme' : undefined}
            tone={unpublishedCount > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Events pipeline"
            value={eventsAreFresh ? 'Working' : 'Stale'}
            hint={lastEventDay ? `Last event ${lastEventDay}` : 'No events recorded'}
            tone={eventsAreFresh ? 'good' : 'warning'}
          />
          <MetricCard
            label="Orders sync"
            value={ordersAreStale ? 'Stopped' : 'Working'}
            hint={lastSyncDay ? `Last Airbyte sync ${lastSyncDay}` : 'Never synced'}
            tone={ordersAreStale ? 'warning' : 'good'}
          />
        </div>

        {untrackedSurfaces.length > 0 ? (
          <Card style={{ marginBottom: 12, borderColor: '#9B2C2C', background: '#FDF0F0' }}>
            <p style={{ margin: '0 0 6px', color: '#9B2C2C', fontSize: 13, fontWeight: 700 }}>
              Git is not the full record for {untrackedSurfaces.length} of these {copySurfaces.length} screens
            </p>
            <p style={{ margin: 0, color: '#7B2222', fontSize: 13, lineHeight: 1.55 }}>
              The copy currently served on {untrackedSurfaces.map((surface) => surface.name).join(' and ')} appears in
              no commit at all — it was edited directly in the Shopify admin and never pulled back into the repository.
              Those versions are shown below marked &quot;Live, absent from Git&quot; and carry no dates, because none
              exist. Until every edit goes through Git, this page will keep missing what visitors actually see.
            </p>
          </Card>
        ) : null}

        <Card style={{ marginBottom: 12, background: '#F8F7F4' }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>How to read the dates</p>
          <p style={{ margin: '0 0 6px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.55 }}>
            Homepage versions up to 3 June 2026 lived in <code>templates/index.json</code>, edited in the theme editor
            and only pushed to Git on a sync. Their dates are <strong style={{ color: '#1A1A1A' }}>upper bounds</strong>
            : the text changed on or before the date shown.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.55 }}>
            Everything else is edited in code, so commit dates are exact — but deploys are manual, so a version can sit
            in Git before it reaches vinpop.nl.
          </p>
        </Card>

        {firstEventDay ? (
          <Card style={{ marginBottom: 12, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Event tracking only started on {firstEventDay}. Versions before that show a dash, not a zero — nothing was
              measured, which is not the same as nobody coming. Orders go back further, to {firstOrderDay}, but stop
              at {lastOrderDay} because Airbyte is down.
            </p>
          </Card>
        ) : null}

        {!result.ok ? (
          <Card style={{ marginBottom: 12, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              {result.reason === 'missing-url'
                ? 'DATABASE_URL is not configured, so no metrics can be shown. The copy history itself is still accurate.'
                : 'Metrics could not be loaded from PostgreSQL. The copy history itself is still accurate.'}
            </p>
          </Card>
        ) : null}
      </PageSection>

      {surfacePeriods.map(({ surface, periods }) => (
        <SurfaceSection
          key={surface.id}
          surface={surface}
          periods={[...periods].reverse()}
          metricsById={metricsById}
          firstEventDay={firstEventDay}
          lastEventDay={lastEventDay}
          firstOrderDay={firstOrderDay}
          lastOrderDay={lastOrderDay}
          today={today}
        />
      ))}

      <PageSection>
        <SectionTitle sub="What this page can and cannot answer today">Interpretation</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <Card>
            <p style={{ margin: 0, color: '#9B2C2C', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Two of the three live screens are not in Git. Any comparison built on commit history alone would be
              measuring copy that visitors never saw.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              The homepage angle keeps swinging back. Match score → science → pain → desire → pain again. The newest
              version returns to almost exactly the promise from May.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              There is no view count anywhere. `site_events` holds quiz events only, so click-through rate cannot be
              computed for any screen.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Quiz completion holds around 90–95% across every measured period. Whatever is failing, it is not the quiz
              itself.
            </p>
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

function SurfaceSection({
  surface,
  periods,
  metricsById,
  firstEventDay,
  lastEventDay,
  firstOrderDay,
  lastOrderDay,
  today,
}: {
  surface: CopySurface;
  periods: CopyVersionPeriod[];
  metricsById: Map<string, CopyVersionPeriodMetrics>;
  firstEventDay: string | null;
  lastEventDay: string | null;
  firstOrderDay: string | null;
  lastOrderDay: string | null;
  today: string;
}) {
  return (
    <PageSection>
      <SectionTitle sub={`${surface.note} · ${surface.url}`}>
        {surface.name} — {surface.versions.length} versions
      </SectionTitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {periods.map((period) => {
          const { version } = period;
          const style = statusStyles[version.status];
          const row = metricsById.get(version.id);
          const eventCoverage = coverageFor(period, firstEventDay, lastEventDay, today);
          const orderCoverage = coverageFor(period, firstOrderDay, lastOrderDay, today);
          const perDay =
            row && eventCoverage.covered > 0 ? row.quizSessions / eventCoverage.covered : null;
          const neverLiveReason =
            version.status === 'live-untracked' ? 'No date — absent from Git' : 'Never exposed to visitors';

          return (
            <Card key={version.id} style={{ borderColor: style.border, padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '12px 20px',
                  background: style.background,
                  borderBottom: '1px solid #E8E6E1',
                }}
              >
                <span
                  style={{
                    background: style.color,
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 5,
                  }}
                >
                  {version.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                  {version.datePrecision === 'unknown'
                    ? 'date unknown'
                    : version.datePrecision === 'sync'
                      ? `on or before ${version.committedOn}`
                      : version.committedOn}
                </span>
                <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                  {period.liveDays === null
                    ? version.status === 'live-untracked'
                      ? 'serving now, duration unknown'
                      : 'never went live'
                    : period.end
                      ? `live ${period.liveDays} days`
                      : `live ${period.liveDays} days and counting`}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 700,
                    color: style.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {style.label}
                </span>
              </div>

              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CopyPreview version={version} />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9B9B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {version.changedFields.length > 0 ? 'Changed' : 'Oldest state in Git'}
                  </span>
                  {version.changedFields.map((field) => (
                    <span
                      key={field}
                      style={{
                        background: '#F3E7E3',
                        color: '#722F37',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {fieldLabels[field]}
                    </span>
                  ))}
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#F4F3F0',
                      color: '#6B6B6B',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {eraLabels[version.era]}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>{version.angle}</p>

                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}
                >
                  <MetricCard
                    label="Quiz sessions"
                    value={hasMeasured(eventCoverage) ? formatNumber(row?.quizSessions ?? 0) : '—'}
                    hint={coverageHint(eventCoverage, 'Tracking not installed yet', neverLiveReason)}
                    tone={eventCoverage.state === 'partial' ? 'warning' : 'default'}
                  />
                  <MetricCard
                    label="Sessions / measured day"
                    value={perDay === null ? '—' : formatRatio(perDay, 1)}
                    hint="Driven by ad spend, not by the copy"
                  />
                  <MetricCard
                    label="Quiz completed"
                    value={hasMeasured(eventCoverage) ? formatNumber(row?.quizCompleted ?? 0) : '—'}
                  />
                  <MetricCard
                    label="Orders"
                    value={hasMeasured(orderCoverage) ? formatNumber(row?.orders ?? 0) : '—'}
                    hint={coverageHint(orderCoverage, 'Airbyte has no data here', neverLiveReason)}
                    tone={orderCoverage.state === 'partial' ? 'warning' : 'default'}
                  />
                  <MetricCard
                    label="Revenue"
                    value={hasMeasured(orderCoverage) ? formatEuro(row?.revenue ?? 0) : '—'}
                    hint="Cancelled orders excluded"
                  />
                </div>

                <p
                  style={{
                    margin: 0,
                    paddingTop: 12,
                    borderTop: '1px dashed #E8E6E1',
                    fontSize: 12,
                    color: '#9B9B9B',
                    lineHeight: 1.5,
                  }}
                >
                  <code style={{ color: '#6B6B6B' }}>{version.commitSha}</code> — {version.commitSubject}
                  <br />
                  <span style={{ color: '#B8B8B8' }}>{version.sourceFile}</span>
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </PageSection>
  );
}

import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import {
  buildCopyVersionPeriods,
  homepageHeroVersions,
  type CopyVersion,
  type CopyVersionField,
  type CopyVersionPeriod,
} from '@/data/copyVersions';
import { getCopyVersionPerformance, type CopyVersionPeriodMetrics } from '@/lib/db';
import { formatEuro, formatNumber, formatRatio } from '@/lib/format';

export const runtime = 'nodejs';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const fieldLabels: Record<CopyVersionField, string> = {
  eyebrow: 'Eyebrow',
  audience: 'Audience line',
  title: 'Headline',
  lead: 'Paragraph',
  ctaPrimary: 'Main button',
  ctaSecondary: 'Secondary link',
};

const statusStyles = {
  live: { label: 'Live on the site', color: '#2D6A4F', background: '#EDF5F0', border: '#2D6A4F' },
  replaced: { label: 'Replaced', color: '#6B6B6B', background: '#F4F3F0', border: '#E8E6E1' },
  unpublished: { label: 'Committed, not published', color: '#B45309', background: '#FFFCF0', border: '#F2C94C' },
} as const;

function toDay(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / MS_PER_DAY));
}

/**
 * How many days of a period the data actually reaches. Airbyte and the event
 * pipeline stop at different dates, so each source gets its own coverage.
 */
function coveredDays(period: CopyVersionPeriod, lastDataDay: string | null, today: string): number | null {
  if (period.liveDays === null) return null;
  if (!lastDataDay) return 0;

  const periodEnd = period.end ?? today;
  const reachable = lastDataDay < periodEnd ? lastDataDay : periodEnd;
  return daysBetween(period.start, reachable);
}

function CoverageNote({ covered, total }: { covered: number | null; total: number | null }) {
  if (covered === null || total === null) {
    return <>Never exposed</>;
  }
  if (total === 0) {
    return <>Period not started</>;
  }
  if (covered >= total) {
    return <>Full period covered</>;
  }
  if (covered === 0) {
    return <>No data for this period</>;
  }
  return (
    <>
      Only {covered} of {total} days covered
    </>
  );
}

function HeroPreview({ version }: { version: CopyVersion }) {
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
        {version.titleBefore} <span style={{ color: '#722F37' }}>{version.titleHighlight}</span>
      </h3>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#6B6B6B', maxWidth: '68ch' }}>{version.lead}</p>

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
        <span style={{ fontSize: 12, color: '#9B9B9B', textDecoration: 'underline' }}>{version.ctaSecondary}</span>
      </div>
    </div>
  );
}

export default async function CopyHistoryPage() {
  await connection();

  const today = new Date().toISOString().slice(0, 10);
  const periods = buildCopyVersionPeriods(homepageHeroVersions, today);
  const livePeriods = periods.filter((period) => period.liveDays !== null);

  const result = await getCopyVersionPerformance(
    livePeriods.map((period) => ({ id: period.version.id, start: period.start, end: period.end })),
  );

  const metrics = result.ok ? result.metrics : null;
  const metricsById = new Map<string, CopyVersionPeriodMetrics>(
    (metrics?.periods ?? []).map((row) => [row.id, row]),
  );

  const lastEventDay = toDay(metrics?.lastEventAt ?? null);
  const lastOrderDay = toDay(metrics?.lastOrderAt ?? null);
  const lastSyncDay = toDay(metrics?.lastOrderSyncAt ?? null);

  const eventsAreFresh = Boolean(lastEventDay && daysBetween(lastEventDay, today) <= 2);
  const ordersAreStale = Boolean(lastSyncDay && daysBetween(lastSyncDay, today) > 2);

  const liveVersion = homepageHeroVersions.find((version) => version.status === 'live') ?? null;
  const unpublished = homepageHeroVersions.filter((version) => version.status === 'unpublished');

  return (
    <DashboardLayout>
      <TopBar
        title="Copy History"
        subtitle="Which homepage headline was live when, and what the data says about each one."
      />

      <PageSection>
        <SectionTitle sub="Reconstructed from the Shopify theme Git history · locales/en.default.json">
          Homepage Hero
        </SectionTitle>

        <Card style={{ marginBottom: 16, background: '#F8F7F4' }}>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.55 }}>
            Dates below are <strong style={{ color: '#1A1A1A' }}>commit dates, not publish dates</strong>. Theme deploys
            are manual, so a version can sit in Git for days before it reaches vinpop.nl. Periods are therefore
            approximations, and any version marked &quot;committed, not published&quot; was never seen by a visitor.
          </p>
        </Card>

        {!result.ok ? (
          <Card style={{ marginBottom: 16, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              {result.reason === 'missing-url'
                ? 'DATABASE_URL is not configured, so no metrics can be shown. The copy history itself is still accurate.'
                : 'Metrics could not be loaded from PostgreSQL. The copy history itself is still accurate.'}
            </p>
          </Card>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <MetricCard label="Versions tracked" value={formatNumber(homepageHeroVersions.length)} />
          <MetricCard
            label="Currently live"
            value={liveVersion ? liveVersion.label : 'Unknown'}
            hint={liveVersion ? liveVersion.titleBefore : undefined}
            tone="good"
          />
          <MetricCard
            label="Waiting to be published"
            value={formatNumber(unpublished.length)}
            hint={unpublished.length > 0 ? 'Committed in Git but not on the live theme' : undefined}
            tone={unpublished.length > 0 ? 'warning' : 'default'}
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

        {ordersAreStale ? (
          <Card style={{ marginBottom: 16, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Airbyte has not synced Shopify orders since {lastSyncDay}. No order exists after {lastOrderDay}, so every
              period ending later shows incomplete or missing sales. Restart the sync before reading revenue here.
            </p>
          </Card>
        ) : null}
      </PageSection>

      <PageSection>
        <SectionTitle sub="Oldest first · each card shows the copy exactly as it was written">
          Every Version
        </SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {periods.map((period) => {
            const { version } = period;
            const style = statusStyles[version.status];
            const row = metricsById.get(version.id);
            const eventCoverage = coveredDays(period, lastEventDay, today);
            const orderCoverage = coveredDays(period, lastOrderDay, today);
            const perDay =
              row && period.liveDays && period.liveDays > 0 ? row.quizSessions / period.liveDays : null;

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
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{version.committedOn}</span>
                  <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                    {period.liveDays === null
                      ? 'never went live'
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
                  <HeroPreview version={version} />

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9B9B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {version.changedFields.length > 0 ? 'Changed' : 'Created'}
                    </span>
                    {version.changedFields.length > 0 ? (
                      version.changedFields.map((field) => (
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
                      ))
                    ) : (
                      <span
                        style={{
                          background: '#F4F3F0',
                          color: '#6B6B6B',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        Initial version of the section
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>{version.angle}</p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <MetricCard
                      label="Quiz sessions"
                      value={period.liveDays === null ? '—' : formatNumber(row?.quizSessions ?? 0)}
                      hint={<CoverageNote covered={eventCoverage} total={period.liveDays} />}
                    />
                    <MetricCard
                      label="Sessions / day"
                      value={perDay === null ? '—' : formatRatio(perDay, 1)}
                      hint="Driven by ad spend, not by the headline"
                    />
                    <MetricCard
                      label="Quiz completed"
                      value={period.liveDays === null ? '—' : formatNumber(row?.quizCompleted ?? 0)}
                    />
                    <MetricCard
                      label="Orders"
                      value={
                        period.liveDays === null || orderCoverage === 0 ? '—' : formatNumber(row?.orders ?? 0)
                      }
                      hint={<CoverageNote covered={orderCoverage} total={period.liveDays} />}
                      tone={orderCoverage !== null && period.liveDays !== null && orderCoverage < period.liveDays ? 'warning' : 'default'}
                    />
                    <MetricCard
                      label="Revenue"
                      value={
                        period.liveDays === null || orderCoverage === 0 ? '—' : formatEuro(row?.revenue ?? 0)
                      }
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
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="What this page can and cannot answer today">Interpretation</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              No headline comparison is possible yet. v1, v2 and v3 carry the same message — only a button word and a
              comma changed — and they cover almost all the measured traffic.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              There is no view count. `site_events` holds quiz events only, so the number of people who actually saw
              each headline is unknown. Click-through rate cannot be computed until `vinpop_page_view` is sent.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Quiz completion holds around 90–95% across every measured period. The drop-off is not in the quiz.
            </p>
          </Card>
          <Card>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
              Sessions per day measure ad spend, not copy. v1 at 6.1 and v3 at 5.6 carried an identical headline — that
              gap is the natural noise floor.
            </p>
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

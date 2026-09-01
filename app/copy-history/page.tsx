import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle, StatCard } from '@/components/ui';
import { TopBar } from '@/components/TopBar';
import {
  buildCopyVersionPeriods,
  copySurfaces,
  daysBetween,
  type CopySurface,
  type CopyVersion,
  type CopyVersionPeriod,
  type CopyVersionStatus,
} from '@/data/copyVersions';
import { getCopyVersionPerformance, type CopyVersionPeriodMetrics } from '@/lib/db';
import { formatEuro, formatNumber, formatRatio } from '@/lib/format';

export const runtime = 'nodejs';

const statusStyles: Record<CopyVersionStatus, { label: string; color: string; background: string }> = {
  live: { label: 'Live', color: '#2D6A4F', background: '#EDF5F0' },
  replaced: { label: 'Replaced', color: '#6B6B6B', background: '#F4F3F0' },
  unpublished: { label: 'Not published', color: '#B45309', background: '#FFFCF0' },
  'live-untracked': { label: 'Live, not in Git', color: '#9B2C2C', background: '#FDF0F0' },
};

type Coverage = { covered: number; total: number; state: 'full' | 'partial' | 'none' | 'never-live' };

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#6B6B6B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '10px 12px',
  background: '#F8F7F4',
  borderBottom: '1px solid #E8E6E1',
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom',
};

const td: React.CSSProperties = {
  padding: '12px 12px',
  borderBottom: '1px solid #F0EEEA',
  fontSize: 12.5,
  color: '#1A1A1A',
  verticalAlign: 'top',
  lineHeight: 1.45,
};

const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

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

function measured(coverage: Coverage): boolean {
  return coverage.state === 'full' || coverage.state === 'partial';
}

/** The date a version went live, stated only as precisely as the evidence allows. */
function liveFrom(version: CopyVersion): { text: string; note: string } {
  if (version.status === 'live-untracked') {
    return { text: 'Unknown', note: 'absent from Git — no date exists anywhere' };
  }
  if (version.status === 'unpublished') {
    return { text: 'Never', note: `written ${version.committedOn}, still not deployed` };
  }
  if (version.datePrecision === 'sync') {
    return { text: `≤ ${version.committedOn}`, note: 'theme-editor edit, captured on a later sync' };
  }
  return { text: version.committedOn, note: 'commit date; deploy may have followed later' };
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 320, minWidth: 150 }}>{children}</div>;
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
  const metricsById = new Map<string, CopyVersionPeriodMetrics>((metrics?.periods ?? []).map((row) => [row.id, row]));

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
        subtitle="Every headline VinPop has run on its three key screens, newest first, with the numbers for each."
      />

      <PageSection>
        <SectionTitle sub="Reconstructed from 208 commits of the Shopify theme repository">Coverage</SectionTitle>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}
        >
          <StatCard label="Screens tracked" value={formatNumber(copySurfaces.length)} hint="Homepage, quiz intro, results" />
          <StatCard label="Versions found" value={formatNumber(totalVersions)} hint="Since 18 November 2025" />
          <StatCard
            label="Live but absent from Git"
            value={formatNumber(untrackedSurfaces.length)}
            hint={untrackedSurfaces.length > 0 ? 'Edited straight in Shopify, never committed' : undefined}
            tone={untrackedSurfaces.length > 0 ? 'warning' : 'good'}
          />
          <StatCard
            label="Committed, not published"
            value={formatNumber(unpublishedCount)}
            hint={unpublishedCount > 0 ? 'Written in Git but not on the live theme' : undefined}
            tone={unpublishedCount > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Events pipeline"
            value={eventsAreFresh ? 'Working' : 'Stale'}
            hint={lastEventDay ? `Last event ${lastEventDay}` : 'No events recorded'}
            tone={eventsAreFresh ? 'good' : 'warning'}
          />
          <StatCard
            label="Orders sync"
            value={ordersAreStale ? 'Stopped' : 'Working'}
            hint={lastSyncDay ? `Last Airbyte sync ${lastSyncDay}` : 'Never synced'}
            tone={ordersAreStale ? 'warning' : 'good'}
          />
        </div>

        <Card style={{ marginBottom: 12, borderColor: '#9B2C2C', background: '#FDF0F0' }}>
          <p style={{ margin: '0 0 6px', color: '#9B2C2C', fontSize: 13, fontWeight: 700 }}>
            Go-live dates cannot be exact — and here is why
          </p>
          <p style={{ margin: '0 0 6px', color: '#7B2222', fontSize: 13, lineHeight: 1.55 }}>
            Nothing records when a Shopify theme was published. Neither the repository nor the database holds a deploy
            log, so the &quot;Live from&quot; column states only what the evidence supports: an exact commit date where
            the copy was edited in code, an upper bound (≤) where it was edited in the theme editor and captured on a
            later sync, and &quot;Unknown&quot; where the live text appears in no commit at all.
          </p>
          <p style={{ margin: 0, color: '#7B2222', fontSize: 13, lineHeight: 1.55 }}>
            The only way to get true go-live dates is to stamp each version with an identifier in the theme and send it
            with every event. From then on the first event carrying a new identifier <em>is</em> the go-live timestamp,
            to the second.
          </p>
        </Card>

        {untrackedSurfaces.length > 0 ? (
          <Card style={{ marginBottom: 12, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, lineHeight: 1.55 }}>
              The copy served today on <strong>{untrackedSurfaces.map((surface) => surface.name).join(' and ')}</strong>{' '}
              appears in no commit — it was edited directly in the Shopify admin and never pulled back. Those rows are
              marked &quot;Live, not in Git&quot; and carry no statistics, because no period can be computed for them.
            </p>
          </Card>
        ) : null}

        {firstEventDay ? (
          <Card style={{ marginBottom: 12, background: '#F8F7F4' }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.55 }}>
              Event tracking started on <strong style={{ color: '#1A1A1A' }}>{firstEventDay}</strong>. Rows before that
              show a dash, not a zero — nothing was measured, which is not the same as nobody coming. Orders run
              from {firstOrderDay} to {lastOrderDay}, where Airbyte stopped.
            </p>
          </Card>
        ) : null}

        {!result.ok ? (
          <Card style={{ marginBottom: 12, borderColor: '#F2C94C', background: '#FFFCF0' }}>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              {result.reason === 'missing-url'
                ? 'DATABASE_URL is not configured, so no statistics are shown. The copy history itself is still accurate.'
                : 'Statistics could not be loaded from PostgreSQL. The copy history itself is still accurate.'}
            </p>
          </Card>
        ) : null}
      </PageSection>

      {surfacePeriods.map(({ surface, periods }) => (
        <SurfaceTable
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
    </DashboardLayout>
  );
}

function SurfaceTable({
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
  const liveVersion = surface.versions.find(
    (version) => version.status === 'live' || version.status === 'live-untracked',
  );

  return (
    <PageSection>
      <SectionTitle sub={`${surface.note} · ${surface.url}`}>
        {surface.name} — {surface.versions.length} versions
      </SectionTitle>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={th}>Ver.</th>
                <th style={th}>Live from</th>
                <th style={th}>Days</th>
                <th style={th}>Eyebrow</th>
                <th style={th}>Headline</th>
                <th style={th}>Paragraph</th>
                <th style={th}>Button</th>
                <th style={{ ...th, textAlign: 'right' }}>Sessions</th>
                <th style={{ ...th, textAlign: 'right' }}>Per day</th>
                <th style={{ ...th, textAlign: 'right' }}>Quiz done</th>
                <th style={{ ...th, textAlign: 'right' }}>Orders</th>
                <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const { version } = period;
                const style = statusStyles[version.status];
                const row = metricsById.get(version.id);
                const eventCoverage = coverageFor(period, firstEventDay, lastEventDay, today);
                const orderCoverage = coverageFor(period, firstOrderDay, lastOrderDay, today);
                const perDay = row && eventCoverage.covered > 0 ? row.quizSessions / eventCoverage.covered : null;
                const date = liveFrom(version);

                return (
                  <tr key={version.id} style={{ background: version.status === 'replaced' ? '#FFFFFF' : style.background }}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{version.label}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: style.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>
                        {style.label}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{date.text}</div>
                      <div style={{ fontSize: 11, color: '#9B9B9B', marginTop: 3, maxWidth: 170 }}>{date.note}</div>
                    </td>
                    <td style={tdNum}>{period.liveDays === null ? '—' : period.liveDays}</td>
                    <td style={td}>
                      <Cell>{version.eyebrow ?? <span style={{ color: '#C4C4C4' }}>none</span>}</Cell>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      <Cell>
                        {version.titleBefore}
                        {version.titleHighlight ? <span style={{ color: '#722F37' }}> {version.titleHighlight}</span> : null}
                      </Cell>
                    </td>
                    <td style={{ ...td, color: '#6B6B6B' }}>
                      <Cell>{version.lead ?? <span style={{ color: '#C4C4C4' }}>none</span>}</Cell>
                    </td>
                    <td style={td}>
                      <Cell>{version.ctaPrimary}</Cell>
                    </td>
                    <td style={tdNum}>{measured(eventCoverage) ? formatNumber(row?.quizSessions ?? 0) : '—'}</td>
                    <td style={tdNum}>{perDay === null ? '—' : formatRatio(perDay, 1)}</td>
                    <td style={tdNum}>{measured(eventCoverage) ? formatNumber(row?.quizCompleted ?? 0) : '—'}</td>
                    <td style={tdNum}>
                      {measured(orderCoverage) ? formatNumber(row?.orders ?? 0) : '—'}
                      {orderCoverage.state === 'partial' ? (
                        <div style={{ fontSize: 10.5, color: '#B45309', fontWeight: 700 }}>
                          {orderCoverage.covered}/{orderCoverage.total} d
                        </div>
                      ) : null}
                    </td>
                    <td style={tdNum}>{measured(orderCoverage) ? formatEuro(row?.revenue ?? 0) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {liveVersion?.blocks?.length ? (
        <Card style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
            Everything else on this screen today
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9B9B9B' }}>
            The copy below the headline block, as served right now. Not versioned — no history exists for these lines.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
            {liveVersion.blocks.map((block) => (
              <div
                key={block.label}
                style={{ borderLeft: '3px solid #E8E6E1', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9B9B9B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {block.label}
                </span>
                <span style={{ fontSize: 12.5, color: '#1A1A1A', lineHeight: 1.5 }}>{block.text}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </PageSection>
  );
}

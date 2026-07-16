'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { formatNumber, formatPercent } from '@/lib/format';

type LandingDay = {
  date: string;
  arrivals: number;
};

type LandingHour = {
  hour: number;
  arrivals: number;
};

type LandingWeekday = {
  weekday: string;
  weekdayIndex: number;
  arrivals: number;
};

type LandingTimingResponse =
  | {
      ok: true;
      metrics: {
        totalArrivals: number;
        topDay: LandingDay | null;
        topHour: LandingHour | null;
        daily: LandingDay[];
        byHour: LandingHour[];
        highIntentConversion: {
          available: boolean;
          method: 'true_click_count' | 'engagement_proxy';
          methodLabel: string;
          sourceTable: string | null;
          thresholdInteractionsPerSession: number;
          totalSessions: number;
          highIntentSessions: number;
          highIntentSessionShare: number | null;
          purchaseUsers: number;
          conversionRateAllSessions: number | null;
          conversionRateHighIntentSessions: number | null;
          daily: Array<{
            date: string;
            sessions: number;
            highIntentSessions: number;
            purchaseUsers: number;
            conversionRateHighIntent: number | null;
          }>;
          beforeAfter: {
            beforeLabel: string;
            afterLabel: string;
            beforeSessions: number;
            afterSessions: number;
            beforeHighIntentSessions: number;
            afterHighIntentSessions: number;
            beforeConversionRateHighIntent: number | null;
            afterConversionRateHighIntent: number | null;
            deltaConversionRateHighIntent: number | null;
          } | null;
          byWeekday: Array<{
            weekday: string;
            weekdayIndex: number;
            sessions: number;
            highIntentSessions: number;
            purchaseUsers: number;
            conversionRateHighIntent: number | null;
          }>;
          bySourceMedium: Array<{
            sourceMedium: string;
            sessions: number;
            highIntentSessions: number;
            purchaseUsersEstimated: number;
            conversionRateHighIntentEstimated: number | null;
          }>;
        };
      };
    }
  | {
      ok: false;
      reason: string;
    };

export function MetaLandingTimingClient({
  period,
  label,
}: {
  period: string;
  label: string;
}) {
  const [data, setData] = useState<LandingTimingResponse | null>(null);
  const [changeDate, setChangeDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/meta/landing-timing?period=${encodeURIComponent(period)}`, {
          cache: 'no-store',
        });
        const json = (await response.json()) as LandingTimingResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, reason: 'connection-failed' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const metrics = data?.ok ? data.metrics : null;
  useEffect(() => {
    if (!metrics || changeDate) return;
    const daily = metrics.highIntentConversion.daily;
    if (!daily.length) return;
    const midpointIndex = Math.floor(daily.length / 2);
    setChangeDate(daily[midpointIndex]?.date ?? '');
  }, [metrics, changeDate]);

  const selectedBeforeAfter = useMemo(() => {
    if (!metrics || !changeDate) return metrics?.highIntentConversion.beforeAfter ?? null;
    const daily = metrics.highIntentConversion.daily;
    if (!daily.length) return null;

    const beforeRows = daily.filter((row) => row.date < changeDate);
    const afterRows = daily.filter((row) => row.date >= changeDate);
    if (!beforeRows.length || !afterRows.length) return null;

    const summarize = (rows: typeof daily) => {
      const sessions = rows.reduce((sum, row) => sum + row.sessions, 0);
      const highIntentSessions = rows.reduce((sum, row) => sum + row.highIntentSessions, 0);
      const purchaseUsers = rows.reduce((sum, row) => sum + row.purchaseUsers, 0);
      return {
        sessions,
        highIntentSessions,
        conversionRateHighIntent: highIntentSessions > 0 ? (purchaseUsers / highIntentSessions) * 100 : null,
      };
    };

    const before = summarize(beforeRows);
    const after = summarize(afterRows);

    return {
      beforeLabel: `${beforeRows[0].date} to ${beforeRows[beforeRows.length - 1].date}`,
      afterLabel: `${afterRows[0].date} to ${afterRows[afterRows.length - 1].date}`,
      beforeSessions: before.sessions,
      afterSessions: after.sessions,
      beforeHighIntentSessions: before.highIntentSessions,
      afterHighIntentSessions: after.highIntentSessions,
      beforeConversionRateHighIntent: before.conversionRateHighIntent,
      afterConversionRateHighIntent: after.conversionRateHighIntent,
      deltaConversionRateHighIntent:
        before.conversionRateHighIntent !== null && after.conversionRateHighIntent !== null
          ? after.conversionRateHighIntent - before.conversionRateHighIntent
          : null,
    };
  }, [metrics, changeDate]);

  const hourlyBuckets = metrics?.byHour.length
    ? metrics.byHour
    : Array.from({ length: 24 }, (_, hour) => ({ hour, arrivals: 0 }));
  const weekdayBuckets = useMemo(() => {
    const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const base = weekdayLabels.map((weekday, weekdayIndex) => ({ weekday, weekdayIndex, arrivals: 0 }));

    for (const row of metrics?.daily ?? []) {
      const weekdayIndex = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      base[weekdayIndex].arrivals += row.arrivals;
    }

    return base;
  }, [metrics]);
  const bestWeekday = useMemo(() => {
    return weekdayBuckets.reduce<LandingWeekday | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);
  }, [weekdayBuckets]);

  return (
    <PageSection>
      <SectionTitle sub={`Landing page arrivals by weekday and hour · ${label}`}>Landing Page Timing</SectionTitle>
      <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
        <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
          This shows the strongest weekdays and hours for landing page arrivals, plus a conversion proxy focused on high-intent sessions.
        </p>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <MetricCard label="Best weekday" value={bestWeekday && bestWeekday.arrivals > 0 ? `${bestWeekday.weekday} (${formatNumber(bestWeekday.arrivals)})` : 'No data'} />
        <MetricCard label="Best hour" value={metrics?.topHour ? `${metrics.topHour.hour.toString().padStart(2, '0')}:00 (${formatNumber(metrics.topHour.arrivals)})` : 'No data'} />
        <MetricCard label="Total arrivals" value={metrics ? formatNumber(metrics.totalArrivals) : 'No data'} />
        <MetricCard label="Sessions >3 interactions (proxy)" value={metrics ? formatNumber(metrics.highIntentConversion.highIntentSessions) : 'No data'} />
        <MetricCard label="CR all sessions" value={metrics ? formatPercent(metrics.highIntentConversion.conversionRateAllSessions) : 'No data'} />
        <MetricCard label="CR sessions >3 interactions" value={metrics ? formatPercent(metrics.highIntentConversion.conversionRateHighIntentSessions) : 'No data'} />
      </div>
      <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#F8F7F4' }}>
        <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
          {metrics?.highIntentConversion.available
            ? `${metrics.highIntentConversion.methodLabel}. Threshold: >${metrics.highIntentConversion.thresholdInteractionsPerSession}. Current share of high-intent sessions: ${formatPercent(metrics.highIntentConversion.highIntentSessionShare)}.${metrics.highIntentConversion.sourceTable ? ` Source table: ${metrics.highIntentConversion.sourceTable}.` : ''}`
            : 'High-intent conversion proxy unavailable: engagement_horaire data is missing for this period.'}
        </p>
      </Card>
      <Card style={{ marginBottom: 12, borderColor: '#E8E6E1', background: '#FFFFFF' }}>
        <label style={{ display: 'block', color: '#1A1A1A', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          Landing page change date (explicit split)
        </label>
        <input
          type="date"
          value={changeDate}
          onChange={(event) => setChangeDate(event.target.value)}
          min={metrics?.highIntentConversion.daily[0]?.date}
          max={metrics?.highIntentConversion.daily[metrics.highIntentConversion.daily.length - 1]?.date}
          style={{
            border: '1px solid #E8E6E1',
            borderRadius: 7,
            padding: '8px 10px',
            color: '#1A1A1A',
            fontSize: 13,
            background: '#FFFFFF',
          }}
        />
      </Card>
      {selectedBeforeAfter ? (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>Landing Page Change Impact (Before vs After)</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <MetricCard label={`Before (${selectedBeforeAfter.beforeLabel})`} value={formatPercent(selectedBeforeAfter.beforeConversionRateHighIntent)} />
            <MetricCard label={`After (${selectedBeforeAfter.afterLabel})`} value={formatPercent(selectedBeforeAfter.afterConversionRateHighIntent)} />
            <MetricCard label="Delta CR high intent" value={formatPercent(selectedBeforeAfter.deltaConversionRateHighIntent)} />
            <MetricCard label="Before high-intent sessions" value={formatNumber(selectedBeforeAfter.beforeHighIntentSessions)} />
            <MetricCard label="After high-intent sessions" value={formatNumber(selectedBeforeAfter.afterHighIntentSessions)} />
          </div>
        </Card>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card>
          <SectionTitle>Arrivals by weekday</SectionTitle>
          {weekdayBuckets.some((row) => row.arrivals > 0) ? (
            <BarChart
              data={weekdayBuckets.map((row) => ({ label: row.weekday, value: row.arrivals, color: '#2D6A4F' }))}
              valueFormatter={(value) => formatNumber(value)}
            />
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No weekday timing data yet.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>Arrivals by hour</SectionTitle>
          <BarChart
            data={hourlyBuckets.map((row) => ({
              label: `${row.hour.toString().padStart(2, '0')}:00`,
              value: row.arrivals,
              color: '#722F37',
            }))}
            valueFormatter={(value) => formatNumber(value)}
          />
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>
        <Card>
          <SectionTitle>High-intent CR by weekday</SectionTitle>
          {metrics && metrics.highIntentConversion.byWeekday.length ? (
            <BarChart
              data={metrics.highIntentConversion.byWeekday.map((row) => ({
                label: row.weekday,
                value: row.conversionRateHighIntent ?? 0,
                color: '#2D6A4F',
              }))}
              valueFormatter={(value) => formatPercent(value)}
            />
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No weekday conversion breakdown yet.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>High-intent by source / medium</SectionTitle>
          {metrics && metrics.highIntentConversion.bySourceMedium.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #E8E6E1', padding: '6px 4px' }}>Source / medium</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #E8E6E1', padding: '6px 4px' }}>High-intent sessions</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #E8E6E1', padding: '6px 4px' }}>CR high-intent (est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.highIntentConversion.bySourceMedium.slice(0, 12).map((row) => (
                    <tr key={row.sourceMedium}>
                      <td style={{ borderBottom: '1px solid #F0EFEC', padding: '6px 4px' }}>{row.sourceMedium}</td>
                      <td style={{ textAlign: 'right', borderBottom: '1px solid #F0EFEC', padding: '6px 4px' }}>{formatNumber(row.highIntentSessions)}</td>
                      <td style={{ textAlign: 'right', borderBottom: '1px solid #F0EFEC', padding: '6px 4px' }}>{formatPercent(row.conversionRateHighIntentEstimated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No source / medium breakdown yet.</p>
          )}
          <p style={{ margin: '10px 0 0', color: '#6B6B6B', fontSize: 12 }}>
            Source / medium conversion rate is estimated by distributing daily purchase users proportionally to high-intent sessions.
          </p>
        </Card>
      </div>
    </PageSection>
  );
}

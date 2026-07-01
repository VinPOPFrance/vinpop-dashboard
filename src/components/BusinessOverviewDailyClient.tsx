'use client';

import { useMemo, useState } from 'react';
import { Card, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { LineChart } from '@/components/dashboard/LineChart';
import { formatDate, formatEuro, formatNumber } from '@/lib/format';
import type { MetaDailyPerformancePoint, SiteBehaviorSeriesPoint } from '@/lib/db';

type Props = {
  siteSeries: SiteBehaviorSeriesPoint[];
  metaDaily: MetaDailyPerformancePoint[];
  hasGa4Rows: boolean;
};

type DayDetail = {
  date: string;
  orders: number;
  abandonedCheckouts: number;
  ratings: number;
  sessions: number | null;
  metaSpend: number;
  metaClicks: number;
};

function aggregateMetaDaily(rows: MetaDailyPerformancePoint[]) {
  const byDate = new Map<string, { spend: number; clicks: number }>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? { spend: 0, clicks: 0 };
    current.spend += row.spend;
    current.clicks += row.clicks;
    byDate.set(row.date, current);
  }
  return byDate;
}

export function BusinessOverviewDailyClient({ siteSeries, metaDaily, hasGa4Rows }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const metaByDate = useMemo(() => aggregateMetaDaily(metaDaily), [metaDaily]);
  const metaSeries = useMemo(
    () =>
      Array.from(metaByDate.entries())
        .map(([date, row]) => ({ date, ...row }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [metaByDate],
  );
  const selectedDay = useMemo<DayDetail | null>(() => {
    if (!selectedDate) return null;
    const site = siteSeries.find((row) => row.date === selectedDate);
    const meta = metaByDate.get(selectedDate);
    if (!site && !meta) return null;
    return {
      date: selectedDate,
      orders: site?.orders ?? 0,
      abandonedCheckouts: site?.abandonedCheckouts ?? 0,
      ratings: site?.ratings ?? 0,
      sessions: site?.sessions ?? null,
      metaSpend: meta?.spend ?? 0,
      metaClicks: meta?.clicks ?? 0,
    };
  }, [metaByDate, selectedDate, siteSeries]);

  return (
    <>
      {!hasGa4Rows ? (
        <Card style={{ marginBottom: 16, borderColor: '#F2C94C', background: '#FFFCF0' }}>
          <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 800 }}>
            GA4 connector exists but usable GA4 traffic tables are not yet available in PostgreSQL.
          </p>
        </Card>
      ) : null}

      <Card style={{ marginBottom: 16 }}>
        {selectedDay ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <SectionTitle sub="Selected chart point">Selected Day Detail</SectionTitle>
              <button type="button" onClick={() => setSelectedDate(null)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E6E1', background: '#FFFFFF', color: '#722F37', cursor: 'pointer', fontWeight: 700 }}>
                Clear date
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <MetricCard label="Date" value={formatDate(selectedDay.date)} />
              <MetricCard label="Orders" value={formatNumber(selectedDay.orders)} />
              <MetricCard label="Abandoned checkouts" value={formatNumber(selectedDay.abandonedCheckouts)} />
              <MetricCard label="Ratings" value={formatNumber(selectedDay.ratings)} />
              <MetricCard label="Meta spend" value={formatEuro(selectedDay.metaSpend)} />
              <MetricCard label="Meta clicks" value={formatNumber(selectedDay.metaClicks)} />
              {hasGa4Rows ? <MetricCard label="Sessions" value={formatNumber(selectedDay.sessions)} /> : null}
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Click any chart point to inspect orders, abandoned checkouts, ratings, Meta spend, Meta clicks, and sessions when available.
          </p>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        {hasGa4Rows ? (
          <Card>
            <SectionTitle>Sessions by Day</SectionTitle>
            <LineChart data={siteSeries.map((row) => ({ label: row.date, value: row.sessions ?? 0 }))} color="#2D6A4F" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} />
          </Card>
        ) : null}
        <Card>
          <SectionTitle>Orders by Day</SectionTitle>
          <LineChart data={siteSeries.map((row) => ({ label: row.date, value: row.orders }))} color="#722F37" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} />
        </Card>
        <Card>
          <SectionTitle>Ratings by Day</SectionTitle>
          <LineChart data={siteSeries.map((row) => ({ label: row.date, value: row.ratings }))} color="#A67C00" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} />
        </Card>
        <Card>
          <SectionTitle>Meta Spend / Clicks by Day</SectionTitle>
          <LineChart data={metaSeries.map((row) => ({ label: row.date, value: row.spend }))} color="#6B6B6B" selectedLabel={selectedDate} onPointClick={(point) => setSelectedDate(point.label)} />
        </Card>
      </div>
    </>
  );
}

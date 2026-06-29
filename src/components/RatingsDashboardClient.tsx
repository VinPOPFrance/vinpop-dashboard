'use client';

import { useMemo, useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { DonutChart } from '@/components/DonutChart';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import type { RatingsIntelligenceMetrics } from '@/lib/db';

type RatingTableRow = {
  wine: string;
  wineId: string;
  ratings: number;
  love: number;
  like: number;
  dislike: number;
  loveRate: number | null;
  likeRate: number | null;
  dislikeRate: number | null;
  positiveRate: number | null;
  action: string;
};

const columns: SortableColumn<RatingTableRow>[] = [
  { key: 'wine', label: 'Wine', type: 'text', width: 220 },
  { key: 'wineId', label: 'Wine ID', type: 'text' },
  { key: 'ratings', label: 'Ratings', type: 'number' },
  { key: 'love', label: 'Love', type: 'number' },
  { key: 'like', label: 'Like', type: 'number' },
  { key: 'dislike', label: 'Dislike', type: 'number' },
  { key: 'loveRate', label: 'Love %', type: 'percent' },
  { key: 'likeRate', label: 'Like %', type: 'percent' },
  { key: 'dislikeRate', label: 'Dislike %', type: 'percent' },
  { key: 'positiveRate', label: 'Positive %', type: 'percent' },
  { key: 'action', label: 'Action', type: 'text' },
];

export function RatingsDashboardClient({ metrics }: { metrics: RatingsIntelligenceMetrics }) {
  const [selectedRatingTypes, setSelectedRatingTypes] = useState(['love', 'like', 'dislike']);
  const [selectedWineId, setSelectedWineId] = useState(metrics.wines[0]?.wineId ?? '');

  const rows = useMemo<RatingTableRow[]>(
    () =>
      metrics.wines.map((wine) => ({
        wine: wine.wineName,
        wineId: wine.wineId,
        ratings: wine.totalRatings,
        love: selectedRatingTypes.includes('love') ? wine.loveCount : 0,
        like: selectedRatingTypes.includes('like') ? wine.likeCount : 0,
        dislike: selectedRatingTypes.includes('dislike') ? wine.dislikeCount : 0,
        loveRate: wine.loveRate,
        likeRate: wine.likeRate,
        dislikeRate: wine.dislikeRate,
        positiveRate: wine.positiveRate,
        action: wine.recommendationLabel,
      })),
    [metrics.wines, selectedRatingTypes],
  );
  const selectedWine = rows.find((row) => row.wineId === selectedWineId) ?? rows[0];
  const toggleType = (type: string) => {
    setSelectedRatingTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {[
          ['Total ratings', formatNumber(metrics.totalRatings)],
          ['Rated wines', formatNumber(metrics.uniqueRatedWines)],
          ['Users with ratings', formatNumber(metrics.usersWithRatings)],
          ['Users with 3+ ratings', formatNumber(metrics.usersWithThreePlusRatings)],
          ['Love %', formatPercent(metrics.loveRate)],
          ['Like %', formatPercent(metrics.likeRate)],
          ['Dislike %', formatPercent(metrics.dislikeRate)],
          ['Positive rating rate', formatPercent(metrics.positiveRatingRate)],
        ].map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>

      <PageSection>
        <SectionTitle sub={`${formatDate(metrics.firstRatingDate)} to ${formatDate(metrics.latestRatingDate)}`}>
          Rating Mix
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 16 }}>
          <Card>
            <DonutChart
              centerLabel="Love Like Dislike"
              data={[
                { label: 'Love', value: metrics.loveCount, color: '#2D6A4F' },
                { label: 'Like', value: metrics.likeCount, color: '#A67C00' },
                { label: 'Dislike', value: metrics.dislikeCount, color: '#B45309' },
              ]}
            />
          </Card>
          <Card>
            <BarChart
              data={metrics.wines.slice(0, 10).map((wine) => ({
                label: wine.wineName,
                value: wine.totalRatings,
                color: '#722F37',
              }))}
              valueFormatter={(value) => formatNumber(value)}
            />
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <SectionTitle sub="Click a wine to inspect its aggregate mix">Wine/Product Ratings</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['love', 'Love'],
              ['like', 'Like'],
              ['dislike', 'Dislike'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleType(key)}
                style={{
                  border: '1px solid #E8E6E1',
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: selectedRatingTypes.includes(key) ? '#722F37' : '#FFFFFF',
                  color: selectedRatingTypes.includes(key) ? '#FFFFFF' : '#6B6B6B',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <SortableDataTable
              columns={columns}
              rows={rows}
              searchPlaceholder="Search wine..."
              initialSortKey="ratings"
              getRowKey={(row) => row.wineId}
              selectedRowKey={selectedWine?.wineId}
              onRowClick={(row) => setSelectedWineId(row.wineId)}
            />
          </Card>
          <Card>
            <div style={{ color: '#1A1A1A', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {selectedWine?.wine ?? 'No wine selected'}
            </div>
            {selectedWine ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#6B6B6B', fontSize: 13 }}>
                <div>Ratings: {formatNumber(selectedWine.ratings)}</div>
                <div>Love: {formatNumber(selectedWine.love)} ({formatPercent(selectedWine.loveRate)})</div>
                <div>Like: {formatNumber(selectedWine.like)} ({formatPercent(selectedWine.likeRate)})</div>
                <div>Dislike: {formatNumber(selectedWine.dislike)} ({formatPercent(selectedWine.dislikeRate)})</div>
                <div style={{ color: '#2D6A4F', fontWeight: 700 }}>Action: {selectedWine.action}</div>
              </div>
            ) : null}
          </Card>
        </div>
      </PageSection>
    </>
  );
}

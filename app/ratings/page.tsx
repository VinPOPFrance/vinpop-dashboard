'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { ratingKpis, wineRatings } from '@/data/mock-ratings';

function RatingBar({ love, like, dislike }: { love: number; like: number; dislike: number }) {
  return (
    <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
      <div style={{ width: love + '%', background: '#2D6A4F' }} title={'Love: ' + love + '%'} />
      <div style={{ width: like + '%', background: '#B45309' }} title={'Like: ' + like + '%'} />
      <div style={{ width: dislike + '%', background: '#C0392B' }} title={'Dislike: ' + dislike + '%'} />
    </div>
  );
}

const matchingInsights = [
  { type: 'critical' as const, title: 'High dislike rate may indicate weak matching', description: 'Two wines have >40% dislike rates. These may not suit the palate profiles of current customers. Review kit composition and consider replacing them.' },
  { type: 'warning' as const, title: 'Average ratings per customer is too low (1.8)', description: 'Customers need 3 ratings for Smart Box eligibility. At 1.8 avg, most customers are blocked. Focus on post-delivery follow-up to encourage more ratings.' },
  { type: 'good' as const, title: 'Love rate is strong at 41%', description: 'When customers do rate, nearly half Love a wine. The matching quality is good — the problem is getting customers to rate at all.' },
];

export default function RatingsPage() {
  return (
    <DashboardLayout>
      <TopBar
        title="Ratings"
        subtitle="Wine matching quality and customer engagement with ratings"
      />

      {/* KPIs */}
      <PageSection>
        <SectionTitle sub="Key metrics on rating behaviour">Rating KPIs</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {ratingKpis.map(kpi => (
            <div key={kpi.id} style={{
              background: '#FFFFFF',
              border: '1px solid #E8E6E1',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 11, color: '#9B9B9B', marginBottom: 8 }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>{kpi.value}</div>
              <StatusBadge status={kpi.status} />
            </div>
          ))}
        </div>
      </PageSection>

      {/* Distribution + Insights */}
      <PageSection>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Distribution */}
          <div>
            <SectionTitle sub="Overall rating distribution">Rating Distribution</SectionTitle>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Love', pct: 41, color: '#2D6A4F', bg: '#EDF7F3' },
                  { label: 'Like', pct: 34, color: '#B45309', bg: '#FEF3CD' },
                  { label: 'Dislike', pct: 25, color: '#C0392B', bg: '#FDECEA' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.pct}%</span>
                    </div>
                    <div style={{ height: 22, background: '#F5F4F0', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ width: item.pct + '%', height: '100%', background: item.color, borderRadius: 5 }} />
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #F5F4F0', paddingTop: 12, fontSize: 12, color: '#9B9B9B' }}>
                  Total: 87 ratings across 30 customers
                </div>
              </div>
            </Card>
          </div>

          {/* Insights */}
          <div>
            <SectionTitle sub="Matching quality observations">Matching Quality Insights</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matchingInsights.map((insight, i) => {
                const borderColor = insight.type === 'good' ? '#2D6A4F' : insight.type === 'critical' ? '#C0392B' : '#B45309';
                const bgColor = insight.type === 'good' ? '#EDF7F3' : insight.type === 'critical' ? '#FDECEA' : '#FEF3CD';
                return (
                  <div key={i} style={{
                    background: bgColor,
                    borderLeft: '3px solid ' + borderColor,
                    borderRadius: 8,
                    padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{insight.title}</div>
                    <p style={{ fontSize: 12, color: '#6B6B6B', margin: 0 }}>{insight.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PageSection>

      {/* Wine Table */}
      <PageSection>
        <SectionTitle sub="Performance of each wine in the Taste Kit">Wine Performance</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F4F0', borderBottom: '1px solid #E8E6E1' }}>
                {['Wine', 'Region', 'Type', 'Ratings', 'Distribution', 'Love', 'Like', 'Dislike', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B6B6B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wineRatings.map((wine, i) => (
                <tr key={wine.id} style={{ borderBottom: i < wineRatings.length - 1 ? '1px solid #F5F4F0' : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1A1A1A', maxWidth: 180 }}>
                    <div>{wine.wine}</div>
                    <div style={{ fontSize: 11, color: '#9B9B9B', marginTop: 2 }}>{wine.comment}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{wine.region}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{wine.type}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1A1A1A' }}>{wine.totalRatings}</td>
                  <td style={{ padding: '10px 14px', minWidth: 120 }}>
                    <RatingBar love={wine.lovePct} like={wine.likePct} dislike={wine.dislikePct} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#2D6A4F', fontWeight: 600 }}>{wine.lovePct}%</td>
                  <td style={{ padding: '10px 14px', color: '#B45309', fontWeight: 600 }}>{wine.likePct}%</td>
                  <td style={{ padding: '10px 14px', color: wine.dislikePct > 30 ? '#C0392B' : '#6B6B6B', fontWeight: wine.dislikePct > 30 ? 700 : 400 }}>{wine.dislikePct}%</td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={wine.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '8px 14px', background: '#FAFAF8', borderTop: '1px solid #E8E6E1', fontSize: 11, color: '#9B9B9B', display: 'flex', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#2D6A4F', borderRadius: 2, display: 'inline-block' }} /> Love</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#B45309', borderRadius: 2, display: 'inline-block' }} /> Like</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#C0392B', borderRadius: 2, display: 'inline-block' }} /> Dislike</span>
          </div>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

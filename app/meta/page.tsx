'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { metaKpis, metaCampaigns, metaInsights } from '@/data/mock-meta';

export default function MetaPage() {
  return (
    <DashboardLayout>
      <TopBar
        title="Meta Ads"
        subtitle="Campaign performance — beyond purchases, track rated customers"
      />

      {/* KPI Cards */}
      <PageSection>
        <SectionTitle sub="Key advertising metrics for the current period">Campaign KPIs</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {metaKpis.map(kpi => (
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

      {/* Insight Cards */}
      <PageSection>
        <SectionTitle sub="Strategic observations — do not judge ads only by purchases">Campaign Insights</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metaInsights.map(insight => {
            const borderColor = insight.type === 'good' ? '#2D6A4F' : insight.type === 'critical' ? '#C0392B' : '#B45309';
            const bgColor = insight.type === 'good' ? '#EDF7F3' : insight.type === 'critical' ? '#FDECEA' : '#FEF3CD';
            return (
              <div key={insight.id} style={{
                background: bgColor,
                border: '1px solid ' + borderColor + '40',
                borderLeft: '3px solid ' + borderColor,
                borderRadius: 8,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 5 }}>{insight.title}</div>
                <p style={{ fontSize: 12, color: '#6B6B6B', margin: 0 }}>{insight.description}</p>
              </div>
            );
          })}
        </div>
      </PageSection>

      {/* Campaign Table */}
      <PageSection>
        <SectionTitle sub="Performance by campaign — including post-purchase activation">Campaign Performance</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F4F0', borderBottom: '1px solid #E8E6E1' }}>
                {['Campaign', 'Spend', 'Clicks', 'CTR', 'Quiz done', 'Kit buyers', 'Rated', 'Revenue', 'ROAS', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B6B6B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metaCampaigns.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < metaCampaigns.length - 1 ? '1px solid #F5F4F0' : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1A1A1A', maxWidth: 200 }}>{c.name}</td>
                  <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>€{c.spend}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{c.clicks.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{c.ctr}%</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{c.quizCompleted}</td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{c.tasteKitBuyers}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.ratedCustomers === 0 ? '#C0392B' : '#2D6A4F' }}>{c.ratedCustomers}</td>
                  <td style={{ padding: '10px 14px', color: '#1A1A1A' }}>€{c.revenue}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.roas >= 3 ? '#2D6A4F' : c.roas >= 2 ? '#B45309' : '#C0392B' }}>{c.roas}×</td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 14px', background: '#FAFAF8', borderTop: '1px solid #E8E6E1', fontSize: 11, color: '#9B9B9B' }}>
            ⓘ "Rated" = customers who have rated at least 1 wine after purchasing. This is the most important metric for Smart Box conversion.
          </div>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { kpis } from '@/data/mock-kpis';
import { funnelStages } from '@/data/mock-funnel';
import { actions } from '@/data/mock-actions';

const bottlenecks = [
  {
    id: 'b1',
    title: 'Taste Kit buyers are not rating wines',
    explanation: '47% of Taste Kit buyers never rate a single wine after receiving their kit.',
    impact: 'Blocks Smart Box conversion. Est. €1,400/month lost revenue.',
    action: 'Send rating reminder email 3 days after estimated delivery.',
    severity: 'critical' as const,
  },
  {
    id: 'b2',
    title: 'Email leads are not converting to buyers',
    explanation: '75% of quiz completers who left their email do not buy a Taste Kit.',
    impact: 'Biggest funnel leak. Fixing it +5% → +12 buyers/month.',
    action: 'Test new email sequence with stronger social proof and urgency.',
    severity: 'critical' as const,
  },
  {
    id: 'b3',
    title: 'Ready customers are not buying Smart Box',
    explanation: '14 customers have 3+ ratings but only 2 have bought a Smart Box.',
    impact: '+30% conversion on this group → +4 Smart Box orders → €480.',
    action: 'Send personalised Smart Box offer with their top wine profile.',
    severity: 'critical' as const,
  },
];

const overviewFunnel = funnelStages.slice(0, 8);

export default function OverviewPage() {
  const maxUsers = overviewFunnel[0].users;
  const todayActions = actions.filter(a => a.status === 'To do' && (a.priority === 'Critical' || a.priority === 'High')).slice(0, 4);

  return (
    <DashboardLayout>
      <TopBar
        title="VinPop Business Dashboard"
        subtitle="Daily overview — revenue, funnel, bottlenecks and actions"
      />

      <PageSection>
        <SectionTitle sub="Key metrics for the current period">KPI Overview</SectionTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 12,
        }}>
          {kpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
        </div>
      </PageSection>

      <PageSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <SectionTitle sub="Snapshot of the customer journey">Funnel Snapshot</SectionTitle>
          <a href="/funnel" style={{ fontSize: 12, color: '#722F37', textDecoration: 'none', marginTop: 2 }}>View full funnel &rarr;</a>
        </div>
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {overviewFunnel.map((stage, i) => {
              const barWidth = Math.round((stage.users / maxUsers) * 100);
              const barColor =
                stage.status === 'good' ? '#2D6A4F' :
                stage.status === 'warning' ? '#B45309' : '#C0392B';
              return (
                <div key={stage.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                    <div style={{ width: 140, fontSize: 12, color: '#6B6B6B', flexShrink: 0 }}>
                      {stage.label}
                    </div>
                    <div style={{ flex: 1, background: '#F5F4F0', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                      <div style={{
                        width: barWidth + '%',
                        height: '100%',
                        background: barColor,
                        borderRadius: 4,
                      }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1A1A1A', flexShrink: 0 }}>
                      {stage.users.toLocaleString()}
                    </div>
                    <div style={{ width: 80, textAlign: 'right', fontSize: 12, flexShrink: 0 }}>
                      {i < overviewFunnel.length - 1 && stage.conversionToNext !== null ? (
                        <span style={{ color: stage.status === 'critical' ? '#C0392B' : '#6B6B6B' }}>
                          {stage.conversionToNext}% &rarr;
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {i < overviewFunnel.length - 1 && (
                    <div style={{ height: 1, background: '#F5F4F0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionTitle sub="Where the funnel is leaking most">Top Bottlenecks</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bottlenecks.map(b => (
                <Card key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', flex: 1, paddingRight: 8 }}>{b.title}</span>
                    <StatusBadge status={b.severity} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 6px' }}>{b.explanation}</p>
                  <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 8px', fontWeight: 500 }}>
                    {b.impact}
                  </p>
                  <p style={{ fontSize: 12, color: '#2D6A4F', margin: 0 }}>
                    Action: {b.action}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <SectionTitle sub="High-priority actions for today">{"Today's Actions"}</SectionTitle>
              <a href="/actions" style={{ fontSize: 12, color: '#722F37', textDecoration: 'none', marginTop: 2 }}>View all &rarr;</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayActions.map(action => (
                <Card key={action.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', flex: 1, paddingRight: 8 }}>{action.title}</span>
                    <PriorityBadge priority={action.priority} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 6px' }}>{action.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#9B9B9B' }}>{action.targetSegment}</span>
                    <button style={{
                      fontSize: 12,
                      background: '#722F37',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}>
                      Take action
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

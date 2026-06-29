import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getTodayActionPlan, type TodayAction } from '@/lib/db';

export const runtime = 'nodejs';

function ActionCard({ action }: { action: TodayAction }) {
  const color = action.priority === 'Critical' ? '#C0392B' : action.priority === 'High' ? '#B45309' : '#2D6A4F';
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>{action.businessProblem}</div>
        <div style={{ color, fontSize: 12, fontWeight: 700 }}>{action.priority}</div>
      </div>
      <p style={{ margin: '0 0 6px', color: '#6B6B6B', fontSize: 13 }}>{action.whyItMatters}</p>
      <p style={{ margin: '0 0 6px', color: '#2D6A4F', fontSize: 13, fontWeight: 600 }}>Today: {action.suggestedAction}</p>
      <p style={{ margin: '0 0 8px', color: '#9B9B9B', fontSize: 12 }}>{action.metricEvidence}</p>
      {action.stageAffected ? (
        <div style={{ borderTop: '1px solid #E8E6E1', paddingTop: 8, marginBottom: 8, color: '#6B6B6B', fontSize: 12, lineHeight: 1.5 }}>
          <div><strong>Stage:</strong> {action.stageAffected}{action.customersAffected ? ` · ${action.customersAffected} customers` : ''}</div>
          {action.recommendedEmail ? <div><strong>Email:</strong> {action.recommendedEmail}</div> : null}
          {action.recommendedOffer ? <div><strong>Offer:</strong> {action.recommendedOffer}</div> : null}
          {action.objectionToAddress ? <div><strong>Objection:</strong> {action.objectionToAddress}</div> : null}
          {action.businessImpact ? <div><strong>Impact:</strong> {action.businessImpact}</div> : null}
        </div>
      ) : null}
      <a href={action.relatedPage} style={{ color: '#722F37', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Open related page</a>
    </Card>
  );
}

export default async function TodayActionPlanPage() {
  await connection();
  const result = await getTodayActionPlan();
  const metrics = result.ok ? result.metrics : null;
  const priorityCounts = metrics
    ? [
        { label: 'Critical', value: metrics.allActions.filter((action) => action.priority === 'Critical').length },
        { label: 'High', value: metrics.allActions.filter((action) => action.priority === 'High').length },
        { label: 'Medium', value: metrics.allActions.filter((action) => action.priority === 'Medium').length },
        { label: 'Low', value: metrics.allActions.filter((action) => action.priority === 'Low').length },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Today Action Plan" subtitle="Prioritized actions from dashboard signals" />
      <PageSection>
        <SectionTitle sub="Top 5 actions">What needs action today</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Action plan generated from aggregate metrics only. No customer data is displayed.
          </p>
        </Card>
        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              {priorityCounts.map((item) => (
                <MetricCard
                  key={item.label}
                  label={`${item.label} actions`}
                  value={item.value.toString()}
                  tone={item.label === 'Critical' || item.label === 'High' ? 'warning' : 'default'}
                />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {metrics.topActions.map((action) => <ActionCard key={`${action.priority}.${action.businessProblem}`} action={action} />)}
            </div>
            <PageSection>
              <SectionTitle sub="All generated actions">Full List</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.allActions.map((action) => <ActionCard key={`all.${action.priority}.${action.businessProblem}`} action={action} />)}
              </div>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { funnelStages } from '@/data/mock-funnel';

export default function FunnelPage() {
  const maxUsers = funnelStages[0].users;

  return (
    <DashboardLayout>
      <TopBar
        title="Customer Funnel"
        subtitle="Full customer journey — from visitor to subscriber"
      />

      {/* Distribution cards */}
      <PageSection>
        <SectionTitle sub="How many customers are currently in each stage">Stage Distribution</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {funnelStages.map(stage => (
            <div key={stage.id} style={{
              background: '#FFFFFF',
              border: '1px solid #E8E6E1',
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#9B9B9B', marginBottom: 6 }}>{stage.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>{stage.users.toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge status={stage.status} />
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Full Funnel Visual */}
      <PageSection>
        <SectionTitle sub="Visualisation of conversion rates and drop-off at each step">Funnel Overview</SectionTitle>
        <Card style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {funnelStages.map((stage, i) => {
              const barWidth = Math.max(4, Math.round((stage.users / maxUsers) * 100));
              const barColor =
                stage.status === 'good' ? '#2D6A4F' :
                stage.status === 'warning' ? '#B45309' : '#C0392B';
              const dropOff = stage.dropOff;

              return (
                <div key={stage.id}>
                  <div style={{ display: 'flex', gap: 16, padding: '10px 0', alignItems: 'flex-start' }}>
                    {/* Step number */}
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: barColor,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {i + 1}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{stage.label}</span>
                        <StatusBadge status={stage.status} />
                      </div>

                      {/* Bar */}
                      <div style={{ background: '#F5F4F0', borderRadius: 4, height: 18, marginBottom: 6, overflow: 'hidden' }}>
                        <div style={{
                          width: barWidth + '%',
                          height: '100%',
                          background: barColor,
                          borderRadius: 4,
                          position: 'relative',
                        }}>
                          {stage.users > 50 && (
                            <span style={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                            }}>
                              {stage.users.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                        <span style={{ color: '#6B6B6B' }}>
                          <strong style={{ color: '#1A1A1A' }}>{stage.users.toLocaleString()}</strong> users
                        </span>
                        {stage.conversionToNext !== null && (
                          <span style={{ color: '#6B6B6B' }}>
                            Conversion: <strong style={{ color: stage.conversionToNext < 40 ? '#C0392B' : '#1A1A1A' }}>{stage.conversionToNext}%</strong>
                          </span>
                        )}
                        {dropOff !== null && (
                          <span style={{ color: '#6B6B6B' }}>
                            Drop-off: <strong style={{ color: dropOff > 50 ? '#C0392B' : '#6B6B6B' }}>{dropOff}%</strong>
                          </span>
                        )}
                        {stage.avgDaysInStage !== null && (
                          <span style={{ color: '#6B6B6B' }}>
                            Avg wait: <strong style={{ color: '#1A1A1A' }}>{stage.avgDaysInStage}d</strong>
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: 12, color: '#6B6B6B', margin: '6px 0 0', fontStyle: 'italic' }}>
                        {stage.interpretation}
                      </p>
                    </div>
                  </div>

                  {i < funnelStages.length - 1 && (
                    <div style={{ marginLeft: 12, paddingLeft: 12, borderLeft: '2px dashed #E8E6E1', height: 10 }} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </PageSection>

      {/* Stage Table */}
      <PageSection>
        <SectionTitle sub="Detailed breakdown with suggested actions">Stage Table</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F4F0', borderBottom: '1px solid #E8E6E1' }}>
                {['Stage', 'Users', 'Conversion', 'Drop-off', 'Avg wait', 'Status', 'Suggested action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B6B6B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funnelStages.map((stage, i) => (
                <tr key={stage.id} style={{ borderBottom: i < funnelStages.length - 1 ? '1px solid #F5F4F0' : 'none' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1A1A1A' }}>{stage.label}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1A1A1A' }}>{stage.users.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: stage.conversionToNext !== null && stage.conversionToNext < 40 ? '#C0392B' : '#1A1A1A' }}>
                    {stage.conversionToNext !== null ? stage.conversionToNext + '%' : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: stage.dropOff !== null && stage.dropOff > 50 ? '#C0392B' : '#6B6B6B' }}>
                    {stage.dropOff !== null ? stage.dropOff + '%' : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                    {stage.avgDaysInStage !== null ? stage.avgDaysInStage + 'd' : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={stage.status} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6B6B6B', maxWidth: 240 }}>{stage.suggestedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

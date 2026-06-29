'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { actions, ActionCategory, ActionStatus } from '@/data/mock-actions';

const categories: (ActionCategory | 'All')[] = ['All', 'Urgent', 'Revenue', 'Funnel', 'Meta', 'Ratings', 'Follow-up', 'Technical'];

const statusColors: Record<ActionStatus, { bg: string; color: string }> = {
  'To do': { bg: '#F5F4F0', color: '#6B6B6B' },
  'In progress': { bg: '#EBF2FF', color: '#1A56DB' },
  'Waiting': { bg: '#FEF3CD', color: '#B45309' },
  'Done': { bg: '#EDF7F3', color: '#2D6A4F' },
};

export default function ActionsPage() {
  const [filter, setFilter] = useState<ActionCategory | 'All'>('All');

  const filtered = filter === 'All' ? actions : actions.filter(a => a.category === filter);

  const urgentCount = actions.filter(a => a.priority === 'Critical' && a.status === 'To do').length;
  const overdueCount = actions.filter(a => a.dueDate === 'Today' && a.status === 'To do').length;
  const revenueCount = actions.filter(a => a.category === 'Revenue' && a.status !== 'Done').length;
  const doneCount = actions.filter(a => a.status === 'Done').length;

  return (
    <DashboardLayout>
      <TopBar
        title="Actions"
        subtitle="What needs to be done today — prioritised and categorised"
      />

      {/* Summary Cards */}
      <PageSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Urgent (Critical)', value: urgentCount, color: '#C0392B', bg: '#FDECEA' },
            { label: 'Due today', value: overdueCount, color: '#B45309', bg: '#FEF3CD' },
            { label: 'Revenue impact', value: revenueCount, color: '#1A56DB', bg: '#EBF2FF' },
            { label: 'Done this week', value: doneCount, color: '#2D6A4F', bg: '#EDF7F3' },
          ].map(item => (
            <div key={item.label} style={{
              background: item.bg,
              border: '1px solid ' + item.color + '30',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 11, color: item.color, fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Filter tabs */}
      <PageSection>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid ' + (filter === cat ? '#722F37' : '#E8E6E1'),
                background: filter === cat ? '#722F37' : '#FFFFFF',
                color: filter === cat ? '#fff' : '#6B6B6B',
                fontSize: 12,
                fontWeight: filter === cat ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <SectionTitle sub={`${filtered.length} action${filtered.length !== 1 ? 's' : ''} shown`}>
          Action List
        </SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(action => {
            const sc = statusColors[action.status];
            return (
              <Card key={action.id}>
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* Main content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', flex: 1 }}>{action.title}</span>
                      <PriorityBadge priority={action.priority} />
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: sc.bg,
                        color: sc.color,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {action.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 8px' }}>{action.description}</p>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11 }}>
                      <span style={{ color: '#9B9B9B' }}>
                        <strong style={{ color: '#6B6B6B' }}>Segment:</strong> {action.targetSegment}
                      </span>
                      <span style={{ color: '#9B9B9B' }}>
                        <strong style={{ color: '#6B6B6B' }}>Category:</strong> {action.category}
                      </span>
                      <span style={{ color: '#9B9B9B' }}>
                        <strong style={{ color: '#6B6B6B' }}>Due:</strong> {action.dueDate}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, padding: '7px 10px', background: '#EDF7F3', borderRadius: 6, fontSize: 12, color: '#2D6A4F' }}>
                      <strong>Expected impact:</strong> {action.expectedImpact}
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                    <button style={{
                      padding: '8px 16px',
                      background: '#722F37',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                      Take action
                    </button>
                    <button style={{
                      padding: '6px 16px',
                      background: 'transparent',
                      color: '#9B9B9B',
                      border: '1px solid #E8E6E1',
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}>
                      Mark done
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageSection>
    </DashboardLayout>
  );
}

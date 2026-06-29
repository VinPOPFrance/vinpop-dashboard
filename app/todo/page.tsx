'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TopBar } from '@/components/TopBar';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SectionTitle, PageSection, Card } from '@/components/Layout';
import { todoSections, TodoItem, TodoStatus } from '@/data/mock-todos';

const statusColors: Record<TodoStatus, { bg: string; color: string }> = {
  'To do': { bg: '#F5F4F0', color: '#6B6B6B' },
  'In progress': { bg: '#EBF2FF', color: '#1A56DB' },
  'Done': { bg: '#EDF7F3', color: '#2D6A4F' },
};

function TodoRow({ item, onToggle }: { item: TodoItem; onToggle: () => void }) {
  const sc = statusColors[item.status];
  const isDone = item.status === 'Done';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid #F5F4F0',
      opacity: isDone ? 0.6 : 1,
    }}>
      <input
        type="checkbox"
        checked={isDone}
        onChange={onToggle}
        style={{ marginTop: 2, cursor: 'pointer', accentColor: '#722F37', width: 15, height: 15, flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: 13,
          color: '#1A1A1A',
          textDecoration: isDone ? 'line-through' : 'none',
          fontWeight: 500,
        }}>
          {item.label}
        </span>
        {item.notes && (
          <p style={{ fontSize: 11, color: '#9B9B9B', margin: '3px 0 0' }}>{item.notes}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <PriorityBadge priority={item.priority} />
        <span style={{
          padding: '2px 8px',
          borderRadius: 20,
          background: sc.bg,
          color: sc.color,
          fontSize: 11,
          fontWeight: 500,
        }}>
          {item.status}
        </span>
      </div>
    </div>
  );
}

export default function TodoPage() {
  const [sections, setSections] = useState(todoSections);

  const toggleItem = (sectionId: string, itemId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map(item => {
          if (item.id !== itemId) return item;
          const nextStatus: TodoStatus = item.status === 'Done' ? 'To do' : 'Done';
          return { ...item, status: nextStatus };
        }),
      };
    }));
  };

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const doneItems = sections.reduce((sum, s) => sum + s.items.filter(i => i.status === 'Done').length, 0);
  const criticalItems = sections.reduce((sum, s) => sum + s.items.filter(i => i.priority === 'Critical' && i.status !== 'Done').length, 0);
  const inProgressItems = sections.reduce((sum, s) => sum + s.items.filter(i => i.status === 'In progress').length, 0);

  return (
    <DashboardLayout>
      <TopBar
        title="To-do List"
        subtitle="Project and daily operations — nothing gets forgotten"
      />

      {/* Summary */}
      <PageSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total tasks', value: totalItems, color: '#1A1A1A', bg: '#F5F4F0' },
            { label: 'Completed', value: doneItems, color: '#2D6A4F', bg: '#EDF7F3' },
            { label: 'In progress', value: inProgressItems, color: '#1A56DB', bg: '#EBF2FF' },
            { label: 'Critical pending', value: criticalItems, color: '#C0392B', bg: '#FDECEA' },
          ].map(item => (
            <div key={item.label} style={{
              background: item.bg,
              border: '1px solid ' + item.color + '20',
              borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ fontSize: 11, color: item.color, fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9B9B9B', marginBottom: 5 }}>
            <span>Overall progress</span>
            <span>{Math.round((doneItems / totalItems) * 100)}% complete</span>
          </div>
          <div style={{ height: 8, background: '#F5F4F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: Math.round((doneItems / totalItems) * 100) + '%',
              height: '100%',
              background: '#722F37',
              borderRadius: 4,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </PageSection>

      {/* Sections */}
      {sections.map(section => {
        const sectionDone = section.items.filter(i => i.status === 'Done').length;
        return (
          <PageSection key={section.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle>{section.title}</SectionTitle>
              <span style={{ fontSize: 11, color: '#9B9B9B', marginTop: -10 }}>
                {sectionDone}/{section.items.length} done
              </span>
            </div>
            <Card style={{ padding: '4px 20px' }}>
              {section.items.map(item => (
                <TodoRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(section.id, item.id)}
                />
              ))}
            </Card>
          </PageSection>
        );
      })}
    </DashboardLayout>
  );
}

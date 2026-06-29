import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getCustomerActivityReadiness } from '@/lib/db';

export const runtime = 'nodejs';

export default async function CustomerActivityReadinessPage() {
  await connection();
  const result = await getCustomerActivityReadiness();
  const metrics = result.ok ? result.metrics : null;

  return (
    <DashboardLayout>
      <TopBar title="Customer Activity Readiness" subtitle="Can we predict sales from sessions and visits?" />
      <PageSection>
        <SectionTitle sub="Metadata search only">Customer Activity Readiness</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Diagnostic only. No event rows or customer data are displayed.
          </p>
        </Card>
        {metrics ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, color: metrics.hasTrackingTables ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>
                {metrics.readinessMessage}
              </p>
            </Card>
            <PageSection>
              <SectionTitle sub="Potential tracking tables from information_schema">Tables Found</SectionTitle>
              {metrics.tablesFound.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.tablesFound.map((table) => (
                    <Card key={`${table.schemaName}.${table.tableName}`}>
                      <div style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>{table.schemaName}.{table.tableName}</div>
                      <p style={{ margin: '6px 0 0', color: '#6B6B6B', fontSize: 12 }}>{table.columns.join(', ')}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card><p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>No visitor/session/event tracking tables found.</p></Card>
              )}
            </PageSection>
            <PageSection>
              <SectionTitle sub="Fields needed for sales anticipation">Required Tracking Plan</SectionTitle>
              <Card><p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{metrics.requiredFields.join(', ')}</p></Card>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Recommended future events">Event Plan</SectionTitle>
              <Card><p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{metrics.recommendedEvents.join(', ')}</p></Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SalesFunnelClient } from '@/components/SalesFunnelClient';
import { TopBar } from '@/components/TopBar';
import { getCachedCustomerIntelligence } from '@/lib/cachedDb';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function SalesFunnelPage() {
  await connection();
  const result = await timeAsync('page:/sales-funnel getCustomerIntelligence', () => getCachedCustomerIntelligence(), {
    category: 'page',
    rowCount: (helperResult) => (helperResult.ok ? helperResult.metrics.customers.length : null),
  });

  return (
    <DashboardLayout>
      <TopBar title="Sales Funnel" subtitle="Customer stages, actions, and funnel opportunities" />
      <PageSection>
        <SectionTitle sub="Full customer lifecycle, using only available tracked data">Stage-Driven Funnel</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Read-only stage intelligence. Customer emails are shown only inside this protected admin dashboard.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            No phone numbers, addresses, or raw payloads are displayed.
          </p>
        </Card>
        {result.ok ? (
          <SalesFunnelClient customers={result.metrics.customers} />
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 700 }}>
              Could not load sales funnel data. Check the server database connection.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

import { connection } from 'next/server';
import { CustomersDashboardClient } from '@/components/CustomersDashboardClient';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getCachedCustomerIntelligence } from '@/lib/cachedDb';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function CustomersPage() {
  await connection();
  const result = await timeAsync('page:/customers getCustomerIntelligence', () => getCachedCustomerIntelligence());
  const customers = result.ok ? result.metrics.customers : [];

  return (
    <DashboardLayout>
      <TopBar title="Customers" subtitle="Customer spend, ratings, stage, and next action" />
      <PageSection>
        <SectionTitle sub="Protected internal admin view">Customer Intelligence</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Customer emails are shown because this is a protected internal admin dashboard.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            Unrated bottles are a best-effort estimate: purchased line-item quantity minus rated wine/product count.
          </p>
        </Card>
        {result.ok ? (
          <CustomersDashboardClient customers={customers} />
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
              Could not load customer intelligence. Check the server database connection.
            </p>
          </Card>
        )}
      </PageSection>
    </DashboardLayout>
  );
}

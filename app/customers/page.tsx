import { Suspense } from 'react';
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
        <Suspense
          fallback={(
            <Card>
              <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 600 }}>
                Loading customer table and lifecycle details...
              </p>
            </Card>
          )}
        >
          <CustomersContent />
        </Suspense>
      </PageSection>
    </DashboardLayout>
  );
}

async function CustomersContent() {
  const result = await timeAsync('page:/customers getCustomerIntelligence', () => getCachedCustomerIntelligence(), {
    category: 'page',
    rowCount: (helperResult) => (helperResult.ok ? helperResult.metrics.customers.length : null),
  });
  const customers = result.ok ? result.metrics.customers : [];

  if (!result.ok) {
    return (
      <Card>
        <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
          Could not load customer intelligence. Check the server database connection.
        </p>
      </Card>
    );
  }

  return <CustomersDashboardClient customers={customers} />;
}

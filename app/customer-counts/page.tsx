import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getDatabaseTableCounts, type SelectedDatabaseTable } from '@/lib/db';

export const runtime = 'nodejs';

const selectedTables: SelectedDatabaseTable[] = [
  { schemaName: 'public', tableName: 'users' },
  { schemaName: 'public', tableName: 'quizz' },
  { schemaName: 'public', tableName: 'ratings' },
  { schemaName: 'public', tableName: 'wines' },
  { schemaName: 'public', tableName: 'food_pairing' },
  { schemaName: 'public', tableName: 'ad_account' },
  { schemaName: 'public', tableName: 'ad_sets' },
  { schemaName: 'public', tableName: 'ads' },
  { schemaName: 'public', tableName: 'ads_insights' },
  { schemaName: 'public', tableName: 'campaigns' },
  { schemaName: 'shopify', tableName: 'customers' },
  { schemaName: 'shopify', tableName: 'orders' },
  { schemaName: 'shopify', tableName: 'order_line' },
  { schemaName: 'shopify', tableName: 'abandoned_checkouts' },
];

function getStatusColor(status: 'counted' | 'missing' | 'error'): string {
  if (status === 'counted') {
    return '#2D6A4F';
  }

  return status === 'missing' ? '#B45309' : '#C0392B';
}

function getStatusBackground(status: 'counted' | 'missing' | 'error'): string {
  if (status === 'counted') {
    return '#EAF4EF';
  }

  return status === 'missing' ? '#FFF7ED' : '#FDECEC';
}

export default async function CustomerCountsPage() {
  await connection();
  const result = await getDatabaseTableCounts(selectedTables);

  const countedTables = result.ok
    ? result.tables.filter((table) => table.status === 'counted')
    : [];
  const missingTables = result.ok
    ? result.tables.filter((table) => table.status === 'missing')
    : [];
  const errorTables = result.ok ? result.tables.filter((table) => table.status === 'error') : [];
  const message = result.ok
    ? `${countedTables.length} of ${selectedTables.length} selected tables counted.`
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load row counts. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Customer Counts"
        subtitle="Read-only row counts for selected business tables"
      />

      <PageSection>
        <SectionTitle sub="Aggregate counts only">Selected Table Row Counts</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Row counts only. No customer data is displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {result.ok && missingTables.length > 0 ? (
            <p style={{ margin: '8px 0 0', color: '#B45309', fontSize: 13, lineHeight: 1.5 }}>
              Missing:{' '}
              {missingTables
                .map((table) => `${table.schemaName}.${table.tableName}`)
                .join(', ')}
            </p>
          ) : null}
          {result.ok && errorTables.length > 0 ? (
            <p style={{ margin: '8px 0 0', color: '#C0392B', fontSize: 13, lineHeight: 1.5 }}>
              Count failed:{' '}
              {errorTables.map((table) => `${table.schemaName}.${table.tableName}`).join(', ')}
            </p>
          ) : null}
        </Card>

        {result.ok ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Schema</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Table</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>
                      Row count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.tables.map((table) => (
                    <tr
                      key={`${table.schemaName}.${table.tableName}`}
                      style={{ borderTop: '1px solid #E8E6E1' }}
                    >
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                        {table.schemaName}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                        {table.tableName}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            background: getStatusBackground(table.status),
                            borderRadius: 999,
                            color: getStatusColor(table.status),
                            display: 'inline-block',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 9px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {table.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', textAlign: 'right' }}>
                        {table.rowCount === null ? '—' : table.rowCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}

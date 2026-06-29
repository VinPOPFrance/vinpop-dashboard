import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getDatabaseTables } from '@/lib/db';

export const runtime = 'nodejs';

export default async function DatabaseInspectPage() {
  await connection();
  const result = await getDatabaseTables();

  const message = result.ok
    ? result.tables.length === 0
      ? 'No non-system tables were found in this database.'
      : `Showing ${result.tables.length} non-system table${result.tables.length === 1 ? '' : 's'} from PostgreSQL metadata.`
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not inspect PostgreSQL metadata. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Database Inspection"
        subtitle="Read-only PostgreSQL schema and table inventory"
      />

      <PageSection>
        <SectionTitle sub="Schemas and tables only">PostgreSQL Tables</SectionTitle>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #E8E6E1' }}>
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              {message}
            </p>
          </div>

          {result.ok && result.tables.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Schema</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Table</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Type</th>
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
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                        {table.tableType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

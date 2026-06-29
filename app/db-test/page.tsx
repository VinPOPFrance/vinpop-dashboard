import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getDatabaseNow } from '@/lib/db';

export const runtime = 'nodejs';

export default async function DatabaseTestPage() {
  await connection();
  const result = await getDatabaseNow();

  const statusColor = result.ok ? '#2D6A4F' : '#B45309';
  const statusLabel = result.ok ? 'Connected' : 'Needs attention';
  const message = result.ok
    ? 'PostgreSQL responded to SELECT now() from the server.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not connect to PostgreSQL. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Database Connection Test"
        subtitle="Minimal server-side PostgreSQL check using SELECT now()"
      />

      <PageSection>
        <SectionTitle sub="Read-only connection test">PostgreSQL Status</SectionTitle>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: statusColor,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: statusColor, fontSize: 13, fontWeight: 700 }}>
                {statusLabel}
              </span>
            </div>

            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              {message}
            </p>

            {result.ok ? (
              <div>
                <div style={{ color: '#9B9B9B', fontSize: 11, marginBottom: 5 }}>
                  Database time
                </div>
                <code
                  style={{
                    display: 'inline-block',
                    background: '#F5F4F0',
                    border: '1px solid #E8E6E1',
                    borderRadius: 6,
                    color: '#1A1A1A',
                    fontSize: 13,
                    padding: '7px 9px',
                  }}
                >
                  {result.now}
                </code>
              </div>
            ) : null}
          </div>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

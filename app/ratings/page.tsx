import { Suspense } from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { RatingsDashboardClient } from '@/components/RatingsDashboardClient';
import { TopBar } from '@/components/TopBar';
import { getCachedRatingsIntelligence } from '@/lib/cachedDb';
import { timeAsync } from '@/lib/performance';

export const runtime = 'nodejs';

export default async function RatingsPage() {
  await connection();

  return (
    <DashboardLayout>
      <TopBar title="Ratings" subtitle="Interactive aggregate Love / Like / Dislike dashboard" />
      <PageSection>
        <SectionTitle sub="Aggregate ratings only">Ratings Overview</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            No individual customer ratings or customer identities are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>
            Wine-level aggregates use public.ratings.id → public.mapping.vp_id → public.mapping.wl_id → public.wines.id.
          </p>
        </Card>
        <Suspense
          fallback={(
            <Card>
              <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 600 }}>
                Loading aggregate rating trends...
              </p>
            </Card>
          )}
        >
          <RatingsContent />
        </Suspense>
      </PageSection>
    </DashboardLayout>
  );
}

async function RatingsContent() {
  const result = await timeAsync('page:/ratings getRatingsIntelligence', () => getCachedRatingsIntelligence(), {
    category: 'page',
    rowCount: (helperResult) => (helperResult.ok ? helperResult.metrics.wines.length : null),
  });
  const metrics = result.ok ? result.metrics : null;

  if (!metrics) {
    return (
      <Card>
        <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
          Could not load rating aggregates. Check the server database connection.
        </p>
      </Card>
    );
  }

  if (!metrics.wineLevelAnalysisAvailable) {
    return (
      <Card>
        <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
          {metrics.wineLevelUnavailableReason}
        </p>
      </Card>
    );
  }

  return <RatingsDashboardClient metrics={metrics} />;
}

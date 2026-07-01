import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Ratings" subtitle="Loading aggregate rating intelligence" />
      <PageSection>
        <SectionTitle>Loading ratings</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing aggregate wine, rating, and calibration signals.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Acquisition & Traffic" subtitle="Loading GA4 acquisition aggregates" />
      <PageSection>
        <SectionTitle>Loading acquisition trends</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing GA4 traffic and conversion aggregates for the selected range.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

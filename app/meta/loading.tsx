import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Meta Creative Performance" subtitle="Loading aggregate Meta signals" />
      <PageSection>
        <SectionTitle>Loading Meta dashboard</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing campaign, ad set, ad, and daily aggregate metrics.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

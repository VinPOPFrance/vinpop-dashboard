import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Sales Funnel" subtitle="Loading customer stage intelligence" />
      <PageSection>
        <SectionTitle>Loading sales funnel</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing customer stages, actions, and selected-stage details.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

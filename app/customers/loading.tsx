import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Customers" subtitle="Loading protected customer intelligence" />
      <PageSection>
        <SectionTitle>Loading customers</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing protected customer lifecycle rows.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

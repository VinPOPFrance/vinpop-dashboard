import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';

export default function Loading() {
  return (
    <DashboardLayout>
      <TopBar title="Business Overview" subtitle="Loading aggregate business signals" />
      <PageSection>
        <SectionTitle>Loading business overview</SectionTitle>
        <Card>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, fontWeight: 700 }}>
            Preparing Shopify, Meta, funnel, and site behavior aggregates.
          </p>
        </Card>
      </PageSection>
    </DashboardLayout>
  );
}

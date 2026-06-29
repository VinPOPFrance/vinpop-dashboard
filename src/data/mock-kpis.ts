export type KpiStatus = 'good' | 'warning' | 'critical';

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  comparison: string;
  comparisonDelta: number; // positive = up
  status: KpiStatus;
  unit?: string;
  description?: string;
}

export const kpis: KpiCard[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    value: '€1,240',
    rawValue: 1240,
    comparison: '+€120 vs last week',
    comparisonDelta: 10.7,
    status: 'warning',
    description: 'Total revenue from Taste Kits and Smart Boxes',
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '10',
    rawValue: 10,
    comparison: '+2 vs last week',
    comparisonDelta: 25,
    status: 'warning',
    description: 'Total orders across all products',
  },
  {
    id: 'taste_kits',
    label: 'Taste Kits sold',
    value: '8',
    rawValue: 8,
    comparison: '+1 vs last week',
    comparisonDelta: 14.3,
    status: 'warning',
    description: 'Taste Kits ordered in period',
  },
  {
    id: 'smart_boxes',
    label: 'Smart Boxes sold',
    value: '2',
    rawValue: 2,
    comparison: '+1 vs last week',
    comparisonDelta: 100,
    status: 'warning',
    description: 'Smart Boxes ordered in period',
  },
  {
    id: 'meta_spend',
    label: 'Meta spend',
    value: '€320',
    rawValue: 320,
    comparison: '−€40 vs last week',
    comparisonDelta: -11.1,
    status: 'good',
    description: 'Total Facebook/Instagram ad spend',
  },
  {
    id: 'roas',
    label: 'ROAS',
    value: '3.9×',
    rawValue: 3.9,
    comparison: '+0.4 vs last week',
    comparisonDelta: 11.4,
    status: 'good',
    description: 'Return on ad spend',
  },
  {
    id: 'cac_taste_kit',
    label: 'CAC Taste Kit',
    value: '€40',
    rawValue: 40,
    comparison: '−€5 vs last week',
    comparisonDelta: -11.1,
    status: 'good',
    description: 'Cost to acquire a Taste Kit buyer',
  },
  {
    id: 'cac_rated',
    label: 'CAC Rated Customer',
    value: '€107',
    rawValue: 107,
    comparison: '+€12 vs last week',
    comparisonDelta: 12.6,
    status: 'critical',
    description: 'Cost to acquire a customer who rated at least 1 wine',
  },
  {
    id: 'ready_smart_box',
    label: 'Ready for Smart Box',
    value: '14',
    rawValue: 14,
    comparison: '+3 vs last week',
    comparisonDelta: 27.3,
    status: 'good',
    description: 'Customers with 3+ ratings, not yet Smart Box buyers',
  },
];

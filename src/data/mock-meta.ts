export interface MetaCampaign {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  quizCompleted: number;
  tasteKitBuyers: number;
  ratedCustomers: number;
  revenue: number;
  roas: number;
  status: 'good' | 'warning' | 'critical';
}

export interface MetaKpi {
  id: string;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}

export const metaKpis: MetaKpi[] = [
  { id: 'total_spend', label: 'Total spend', value: '€320', status: 'good' },
  { id: 'impressions', label: 'Impressions', value: '42,800', status: 'good' },
  { id: 'clicks', label: 'Clicks', value: '1,284', status: 'good' },
  { id: 'ctr', label: 'CTR', value: '3.0%', status: 'good' },
  { id: 'cpc', label: 'CPC', value: '€0.25', status: 'good' },
  { id: 'quiz_starts', label: 'Quiz starts', value: '710', status: 'good' },
  { id: 'quiz_completions', label: 'Quiz completions', value: '510', status: 'good' },
  { id: 'taste_kit_buyers', label: 'Taste Kit buyers', value: '8', status: 'warning' },
  { id: 'cost_quiz', label: 'Cost / quiz completion', value: '€0.63', status: 'good' },
  { id: 'cost_taste_kit', label: 'Cost / Taste Kit buyer', value: '€40', status: 'good' },
  { id: 'cost_rated', label: 'Cost / rated customer', value: '€107', status: 'critical' },
  { id: 'revenue', label: 'Revenue attributed', value: '€960', status: 'warning' },
  { id: 'roas', label: 'ROAS', value: '3.0×', status: 'warning' },
];

export const metaCampaigns: MetaCampaign[] = [
  {
    id: 'c1',
    name: 'Campaign A — Quiz Lookalike',
    spend: 140,
    impressions: 18200,
    clicks: 546,
    ctr: 3.0,
    cpc: 0.26,
    quizCompleted: 220,
    tasteKitBuyers: 5,
    ratedCustomers: 3,
    revenue: 600,
    roas: 4.3,
    status: 'good',
  },
  {
    id: 'c2',
    name: 'Campaign B — Broad Wine Lovers',
    spend: 140,
    impressions: 17400,
    clicks: 522,
    ctr: 3.0,
    cpc: 0.27,
    quizCompleted: 180,
    tasteKitBuyers: 2,
    ratedCustomers: 0,
    revenue: 240,
    roas: 1.7,
    status: 'critical',
  },
  {
    id: 'c3',
    name: 'Campaign C — Retargeting Quiz',
    spend: 40,
    impressions: 7200,
    clicks: 216,
    ctr: 3.0,
    cpc: 0.19,
    quizCompleted: 110,
    tasteKitBuyers: 1,
    ratedCustomers: 0,
    revenue: 120,
    roas: 3.0,
    status: 'warning',
  },
];

export const metaInsights = [
  {
    id: 'i1',
    type: 'warning' as const,
    title: 'Campaign B generates buyers but no rated customers',
    description: 'Campaign B spent €140 and acquired 2 Taste Kit buyers, but 0 have rated a wine. These customers may not be genuinely engaged with wine. Consider pausing or targeting a more passionate audience.',
  },
  {
    id: 'i2',
    type: 'good' as const,
    title: 'Campaign A creates better-activated customers',
    description: 'Campaign A costs more per buyer (€28 vs €70) but 3 out of 5 buyers have rated wines. These customers are far more likely to buy a Smart Box. ROAS measured on purchases alone (4.3×) underestimates its real value.',
  },
  {
    id: 'i3',
    type: 'critical' as const,
    title: 'Overall CAC for rated customers is too high',
    description: 'At €107 per rated customer, the funnel after acquisition is leaking. The ad cost is reasonable but rating completion is low. Fix the post-delivery email sequence before scaling spend.',
  },
];

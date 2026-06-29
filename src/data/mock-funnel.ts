export type StageStatus = 'good' | 'warning' | 'critical';

export interface FunnelStage {
  id: string;
  label: string;
  users: number;
  conversionToNext: number | null; // percentage
  dropOff: number | null;
  avgDaysInStage: number | null;
  status: StageStatus;
  interpretation: string;
  suggestedAction: string;
}

export const funnelStages: FunnelStage[] = [
  {
    id: 'visitor',
    label: 'Visitors',
    users: 1850,
    conversionToNext: 38.4,
    dropOff: 61.6,
    avgDaysInStage: 1,
    status: 'good',
    interpretation: 'Traffic volume is healthy. Focus on quality over quantity.',
    suggestedAction: 'Monitor bounce rate and source quality.',
  },
  {
    id: 'quiz_started',
    label: 'Quiz started',
    users: 710,
    conversionToNext: 71.8,
    dropOff: 28.2,
    avgDaysInStage: 1,
    status: 'good',
    interpretation: 'Most visitors who start the quiz complete it.',
    suggestedAction: 'Keep quiz short and engaging.',
  },
  {
    id: 'quiz_completed',
    label: 'Quiz completed',
    users: 510,
    conversionToNext: 62.7,
    dropOff: 37.3,
    avgDaysInStage: 2,
    status: 'warning',
    interpretation: 'Some friction between quiz completion and lead capture.',
    suggestedAction: 'Optimise the email capture step at end of quiz.',
  },
  {
    id: 'email_lead',
    label: 'Email leads',
    users: 320,
    conversionToNext: 25.0,
    dropOff: 75.0,
    avgDaysInStage: 5,
    status: 'critical',
    interpretation: 'Only 1 in 4 leads converts to a Taste Kit purchase. Biggest drop-off.',
    suggestedAction: 'Improve email sequence, test urgency and social proof.',
  },
  {
    id: 'taste_kit_buyer',
    label: 'Taste Kit buyers',
    users: 80,
    conversionToNext: null,
    dropOff: null,
    avgDaysInStage: 7,
    status: 'warning',
    interpretation: 'Buyers wait for delivery before they can rate wines.',
    suggestedAction: 'Send anticipation email during delivery window.',
  },
  {
    id: 'needs_to_rate',
    label: 'Needs to rate wines',
    users: 57,
    conversionToNext: 52.6,
    dropOff: 47.4,
    avgDaysInStage: 12,
    status: 'critical',
    interpretation: 'Almost half of Taste Kit buyers never rate a single wine.',
    suggestedAction: 'Send rating reminder email 3 days after estimated delivery.',
  },
  {
    id: 'rated_1',
    label: 'Rated ≥1 wine',
    users: 30,
    conversionToNext: 46.7,
    dropOff: 53.3,
    avgDaysInStage: 8,
    status: 'critical',
    interpretation: 'Many raters stop after 1 wine. 3 ratings are needed for Smart Box.',
    suggestedAction: 'Send "you are 2 ratings away from your Smart Box" email.',
  },
  {
    id: 'ready_smart_box',
    label: 'Ready for Smart Box',
    users: 14,
    conversionToNext: 14.3,
    dropOff: 85.7,
    avgDaysInStage: 6,
    status: 'critical',
    interpretation: 'Very few ready customers convert to Smart Box. Offer or timing issue.',
    suggestedAction: 'Send personalised Smart Box offer with their top wine results.',
  },
  {
    id: 'smart_box_buyer',
    label: 'Smart Box buyers',
    users: 2,
    conversionToNext: 50.0,
    dropOff: 50.0,
    avgDaysInStage: 30,
    status: 'warning',
    interpretation: 'Volume too small to draw conclusions. Need more data.',
    suggestedAction: 'Focus on increasing Smart Box conversion first.',
  },
  {
    id: 'repeat_buyer',
    label: 'Repeat buyers',
    users: 1,
    conversionToNext: 0,
    dropOff: 100,
    avgDaysInStage: null,
    status: 'warning',
    interpretation: 'Too early to assess retention. Need more Smart Box buyers.',
    suggestedAction: 'Prepare subscription offer for repeat buyers.',
  },
  {
    id: 'subscriber',
    label: 'Subscribers',
    users: 0,
    conversionToNext: null,
    dropOff: null,
    avgDaysInStage: null,
    status: 'warning',
    interpretation: 'No subscribers yet. Subscription product not yet launched.',
    suggestedAction: 'Prepare subscription model for next quarter.',
  },
];

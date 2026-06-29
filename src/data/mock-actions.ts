export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ActionStatus = 'To do' | 'In progress' | 'Waiting' | 'Done';
export type ActionCategory = 'Funnel' | 'Revenue' | 'Meta' | 'Ratings' | 'Follow-up' | 'Technical' | 'Urgent';

export interface Action {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: ActionStatus;
  category: ActionCategory;
  targetSegment: string;
  expectedImpact: string;
  dueDate: string;
  owner: string;
}

export const actions: Action[] = [
  {
    id: 'a1',
    title: 'Send rating reminder email',
    description: 'Taste Kit buyers who received their kit 4+ days ago and have not rated a single wine.',
    priority: 'Critical',
    status: 'To do',
    category: 'Funnel',
    targetSegment: '27 customers in "needs to rate" stage',
    expectedImpact: 'Convert 40% → +11 rated customers → €1,100+ potential Smart Box revenue',
    dueDate: 'Today',
    owner: '—',
  },
  {
    id: 'a2',
    title: 'Send Smart Box offer to ready customers',
    description: 'Customers with 3+ wine ratings who have not yet received a Smart Box offer.',
    priority: 'Critical',
    status: 'To do',
    category: 'Revenue',
    targetSegment: '14 customers ready for Smart Box',
    expectedImpact: 'Convert 30% → +4 Smart Box orders → €480 revenue',
    dueDate: 'Today',
    owner: '—',
  },
  {
    id: 'a3',
    title: 'Review Meta campaign performance',
    description: 'Check CAC, ROAS, and which campaigns generate rated customers vs unrated buyers.',
    priority: 'High',
    status: 'To do',
    category: 'Meta',
    targetSegment: 'All active Meta campaigns',
    expectedImpact: 'Identify wasteful spend. Potential €80/week savings.',
    dueDate: 'Today',
    owner: '—',
  },
  {
    id: 'a4',
    title: 'Investigate quiz-to-purchase drop-off',
    description: '75% of email leads do not buy a Taste Kit. Analyse email sequence, landing page, and pricing.',
    priority: 'High',
    status: 'In progress',
    category: 'Funnel',
    targetSegment: '240+ unconverted email leads',
    expectedImpact: '+5% conversion → +12 Taste Kit buyers/month',
    dueDate: 'This week',
    owner: '—',
  },
  {
    id: 'a5',
    title: 'Check Airbyte sync status',
    description: 'Verify that last night\'s data sync completed successfully for Shopify, Meta, and ratings.',
    priority: 'High',
    status: 'To do',
    category: 'Technical',
    targetSegment: 'Data pipeline',
    expectedImpact: 'Ensures dashboard data is accurate and up to date.',
    dueDate: 'This morning',
    owner: '—',
  },
  {
    id: 'a6',
    title: 'Review wines with high dislike rate',
    description: 'Any wine with >30% Dislike rating should be reviewed and potentially replaced in kits.',
    priority: 'Medium',
    status: 'To do',
    category: 'Ratings',
    targetSegment: '3 wines flagged',
    expectedImpact: 'Better matching → higher Smart Box conversion',
    dueDate: 'This week',
    owner: '—',
  },
  {
    id: 'a7',
    title: 'Prepare post-delivery email sequence',
    description: 'Create a 3-email sequence: delivery confirmation → rating nudge → 2nd rating nudge.',
    priority: 'Medium',
    status: 'Waiting',
    category: 'Follow-up',
    targetSegment: 'All future Taste Kit buyers',
    expectedImpact: 'Systematic improvement of rating completion rate',
    dueDate: 'Next week',
    owner: '—',
  },
  {
    id: 'a8',
    title: 'Pause underperforming Meta campaign',
    description: 'Campaign B has spent €140 with 0 rated customers. ROAS below 1.5. Pause and reallocate.',
    priority: 'High',
    status: 'To do',
    category: 'Meta',
    targetSegment: 'Campaign B — broad audience',
    expectedImpact: 'Saves €140/week and reallocates to Campaign A (ROAS 5.2)',
    dueDate: 'Today',
    owner: '—',
  },
];

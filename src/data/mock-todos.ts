export type TodoPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TodoStatus = 'To do' | 'In progress' | 'Done';

export interface TodoItem {
  id: string;
  label: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: string;
  notes?: string;
}

export interface TodoSection {
  id: string;
  title: string;
  category: string;
  items: TodoItem[];
}

export const todoSections: TodoSection[] = [
  {
    id: 'daily',
    title: 'Daily operations',
    category: 'Daily',
    items: [
      { id: 'd1', label: 'Check dashboard every morning', priority: 'High', status: 'To do' },
      { id: 'd2', label: 'Review new orders in Shopify', priority: 'High', status: 'To do' },
      { id: 'd3', label: 'Review Taste Kit buyers with no ratings', priority: 'Critical', status: 'To do' },
      { id: 'd4', label: 'Review Smart Box-ready customers', priority: 'Critical', status: 'To do' },
      { id: 'd5', label: 'Check Meta spend and ROAS', priority: 'High', status: 'To do' },
      { id: 'd6', label: 'Check Airbyte sync status', priority: 'High', status: 'To do' },
    ],
  },
  {
    id: 'data_quality',
    title: 'Data quality',
    category: 'Technical',
    items: [
      { id: 'dq1', label: 'Verify Shopify orders are imported correctly', priority: 'High', status: 'To do' },
      { id: 'dq2', label: 'Verify Meta data is imported', priority: 'High', status: 'To do' },
      { id: 'dq3', label: 'Verify ratings are imported from VinPop server', priority: 'High', status: 'To do' },
      { id: 'dq4', label: 'Check for duplicate customer records', priority: 'Medium', status: 'To do' },
      { id: 'dq5', label: 'Check for missing customer emails', priority: 'Medium', status: 'To do' },
      { id: 'dq6', label: 'Check for wrong product classification', priority: 'Low', status: 'To do' },
    ],
  },
  {
    id: 'funnel',
    title: 'Funnel improvement',
    category: 'Funnel',
    items: [
      { id: 'f1', label: 'Improve quiz completion rate', priority: 'Medium', status: 'In progress', notes: 'A/B test shorter quiz version' },
      { id: 'f2', label: 'Improve email capture at end of quiz', priority: 'High', status: 'To do' },
      { id: 'f3', label: 'Improve Taste Kit conversion from email leads', priority: 'Critical', status: 'To do', notes: '75% drop-off — biggest leak' },
      { id: 'f4', label: 'Improve rating completion after delivery', priority: 'Critical', status: 'To do' },
      { id: 'f5', label: 'Improve Smart Box conversion from ready customers', priority: 'Critical', status: 'To do' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    category: 'Marketing',
    items: [
      { id: 'm1', label: 'Review Meta campaign performance weekly', priority: 'High', status: 'To do' },
      { id: 'm2', label: 'Pause Campaign B (low rated customer rate)', priority: 'High', status: 'To do' },
      { id: 'm3', label: 'Increase budget on Campaign A (ROAS 4.3)', priority: 'High', status: 'To do' },
      { id: 'm4', label: 'Prepare retargeting audience for rated customers', priority: 'Medium', status: 'To do' },
      { id: 'm5', label: 'Write post-delivery email sequence (3 emails)', priority: 'Critical', status: 'In progress' },
      { id: 'm6', label: 'Write Smart Box offer email', priority: 'Critical', status: 'To do' },
    ],
  },
  {
    id: 'product',
    title: 'Product & matching',
    category: 'Product',
    items: [
      { id: 'p1', label: 'Review wines with >30% dislike rate', priority: 'High', status: 'To do', notes: 'Côtes du Rhône & Gigondas flagged' },
      { id: 'p2', label: 'Review Taste Kit box composition', priority: 'Medium', status: 'To do' },
      { id: 'p3', label: 'Collect qualitative customer feedback', priority: 'Medium', status: 'To do' },
      { id: 'p4', label: 'Improve matching algorithm based on rating data', priority: 'Low', status: 'To do' },
    ],
  },
  {
    id: 'technical',
    title: 'Technical',
    category: 'Technical',
    items: [
      { id: 't1', label: 'Monitor Airbyte sync daily', priority: 'High', status: 'In progress' },
      { id: 't2', label: 'Set up PostgreSQL connection to dashboard', priority: 'High', status: 'To do', notes: 'After design is confirmed' },
      { id: 't3', label: 'Deploy dashboard to dashboard.vinpop.nl', priority: 'Medium', status: 'To do' },
      { id: 't4', label: 'Add authentication (login page)', priority: 'Medium', status: 'To do' },
      { id: 't5', label: 'Set up database backups', priority: 'High', status: 'To do' },
      { id: 't6', label: 'Add real data connection (replace mock data)', priority: 'High', status: 'To do' },
    ],
  },
];

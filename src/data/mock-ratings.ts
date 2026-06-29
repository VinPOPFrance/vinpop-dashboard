export interface WineRating {
  id: string;
  wine: string;
  region: string;
  type: string;
  totalRatings: number;
  lovePct: number;
  likePct: number;
  dislikePct: number;
  status: 'good' | 'warning' | 'critical';
  comment: string;
}

export interface RatingKpi {
  id: string;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}

export const ratingKpis: RatingKpi[] = [
  { id: 'total', label: 'Total ratings', value: '87', status: 'warning' },
  { id: 'avg_per_customer', label: 'Avg ratings / customer', value: '1.8', status: 'critical' },
  { id: 'love_pct', label: '% Love', value: '41%', status: 'good' },
  { id: 'like_pct', label: '% Like', value: '34%', status: 'good' },
  { id: 'dislike_pct', label: '% Dislike', value: '25%', status: 'warning' },
  { id: 'zero_ratings', label: 'Customers with 0 ratings', value: '27', status: 'critical' },
  { id: 'at_least_1', label: 'Customers ≥1 rating', value: '30', status: 'warning' },
  { id: 'at_least_3', label: 'Customers ≥3 ratings', value: '14', status: 'warning' },
  { id: 'avg_days_first', label: 'Avg days to first rating', value: '9 days', status: 'critical' },
];

export const wineRatings: WineRating[] = [
  {
    id: 'w1',
    wine: 'Château Moulin Rouge 2021',
    region: 'Bordeaux',
    type: 'Red',
    totalRatings: 18,
    lovePct: 56,
    likePct: 28,
    dislikePct: 16,
    status: 'good',
    comment: 'Top performer. Consider featuring in Smart Box.',
  },
  {
    id: 'w2',
    wine: 'Domaine des Pins Blanc 2022',
    region: 'Loire',
    type: 'White',
    totalRatings: 15,
    lovePct: 40,
    likePct: 40,
    dislikePct: 20,
    status: 'good',
    comment: 'Balanced reception. Good inclusion.',
  },
  {
    id: 'w3',
    wine: 'Côtes du Rhône Rouge 2020',
    region: 'Rhône',
    type: 'Red',
    totalRatings: 12,
    lovePct: 25,
    likePct: 33,
    dislikePct: 42,
    status: 'critical',
    comment: 'High dislike rate. Review or replace in next kit batch.',
  },
  {
    id: 'w4',
    wine: 'Muscadet Sèvre et Maine 2022',
    region: 'Loire',
    type: 'White',
    totalRatings: 10,
    lovePct: 50,
    likePct: 30,
    dislikePct: 20,
    status: 'good',
    comment: 'Well received by white wine profiles.',
  },
  {
    id: 'w5',
    wine: 'Gigondas Rouge 2019',
    region: 'Rhône',
    type: 'Red',
    totalRatings: 9,
    lovePct: 33,
    likePct: 22,
    dislikePct: 45,
    status: 'critical',
    comment: 'High tannin profile may not suit beginner palates. Reconsider.',
  },
  {
    id: 'w6',
    wine: 'Sancerre Blanc 2022',
    region: 'Loire',
    type: 'White',
    totalRatings: 8,
    lovePct: 62,
    likePct: 25,
    dislikePct: 13,
    status: 'good',
    comment: 'Excellent Love rate. Keep in rotation.',
  },
  {
    id: 'w7',
    wine: 'Beaujolais Nouveau 2023',
    region: 'Beaujolais',
    type: 'Red',
    totalRatings: 8,
    lovePct: 25,
    likePct: 37,
    dislikePct: 38,
    status: 'warning',
    comment: 'Polarising. Consider removing from mixed kits.',
  },
  {
    id: 'w8',
    wine: 'Chablis Premier Cru 2021',
    region: 'Burgundy',
    type: 'White',
    totalRatings: 7,
    lovePct: 57,
    likePct: 29,
    dislikePct: 14,
    status: 'good',
    comment: 'Strong performer for white wine lovers.',
  },
];

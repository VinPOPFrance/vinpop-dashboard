import { redirect } from 'next/navigation';

/**
 * Racine du dashboard.
 *
 * Redirige vers la premiere etape du funnel : depuis le Lot 9, la page
 * Business Overview n existe plus et les 7 etapes sont la seule lecture.
 */
export default function HomePage() {
  redirect('/funnel/1-experience');
}

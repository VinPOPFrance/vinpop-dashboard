import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCustomerDetailedRatings } from '@/lib/db';

/**
 * Detail des bouteilles d un client, pour le panneau de droite des etapes 5 et 6.
 *
 * Cette route existe pour que la selection d un client dans la liste de gauche
 * ne recharge pas la page : les etapes 5 et 6 chargent deja des agregats
 * lourds, les relire a chaque clic rendrait la lecture croisee inutilisable.
 *
 * Elle n est PAS publique : absente des chemins ouverts du middleware, elle
 * exige le cookie du dashboard comme toutes les pages protegees. Lecture seule.
 */

export const runtime = 'nodejs';

/** Un email ou un id client Shopify : au-dela, c est une entree malformee. */
const MAX_IDENTIFIER_LENGTH = 320;

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim() ?? '';

  if (!email || email.length > MAX_IDENTIFIER_LENGTH) {
    return NextResponse.json({ ok: false, reason: 'invalid-email' }, { status: 400 });
  }

  const result = await getCustomerDetailedRatings(email);

  if (!result.ok) {
    // Une base injoignable n est pas une erreur de la requete : le panneau
    // affiche le motif, la page reste utilisable.
    const status = result.reason === 'unknown-customer' ? 404 : 200;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, detail: result.detail }, { status: 200 });
}

/**
 * Point d entree de la couche donnees.
 *
 * `src/lib/db.ts` faisait 7 724 lignes et melangeait les cinq sources. Il est
 * decoupe par source depuis le Lot 3, mais l adresse d import ne change pas :
 * les pages continuent d ecrire `from '@/lib/db'`.
 *
 * Organisation des modules (le graphe de dependances est sans cycle) :
 *
 *   types ── formes publiques, aucun code executable
 *   client ─ pool PostgreSQL et conversions de types
 *   sql ──── fragments SQL partages (lignes de commande, historique client)
 *      |
 *      +-- admin ...... inspection de la base
 *      +-- shopify .... commandes, produits, stock
 *      +-- internal ... quiz, notes, vins, evenements site
 *      +-- meta ....... Meta Ads
 *      +-- ga4 ........ Google Analytics 4
 *      +-- googleAds .. Google Ads
 *      +-- forecast ... charges saisies (schema dashboard, en ecriture)
 *           |
 *           +-- overview ... vues croisant plusieurs sources
 */

export * from './types';
export * from './client';
export * from './sql';
export * from './admin';
export * from './shopify';
export * from './internal';
export * from './meta';
export * from './ga4';
export * from './googleAds';
export * from './forecast';
export * from './overview';

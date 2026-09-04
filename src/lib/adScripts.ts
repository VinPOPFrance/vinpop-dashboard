/**
 * Scripts publicitaires importes de "Ads integral.xlsx".
 *
 * Le classeur decrit seconde par seconde ce que dit et montre chaque video :
 * c est ce qui permet de passer de "cette creative a un hook rate de 8 %" a
 * "voici les trois premieres secondes a reecrire". Le JSON est genere par
 * `npm run import:ad-scripts` et commite ; ce module se contente de l indexer.
 *
 * L index par identifiant d annonce ne suffit pas : le classeur a ete rempli a
 * la main, et une publicite dupliquee dans Meta (meme script, deux annonces) n
 * y figure qu une fois. Un second index par nom normalise rattrape ces cas,
 * qui representent aujourd hui pres d un tiers des creatives actives.
 */

import scriptData from '@/data/ad-scripts.json';

export type AdScript = {
  adId: string;
  adName: string;
  /** Feuille d origine dans le classeur : utile pour retrouver la source. */
  sheet: string;
  format: 'video' | 'image';
  headers: string[];
  rows: string[][];
};

export type AdScriptIndexEntry = {
  adId: string;
  adName: string;
};

const scripts = scriptData.ads as AdScript[];

/** Nom d annonce reduit a sa substance : accents, casse et ponctuation retires. */
function normalizeName(name: string): string {
  return name
    // NFD detache les accents de leur lettre ; le filtre suivant les emporte.
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const byAdId = new Map(scripts.map((script) => [script.adId, script]));

// Une seule entree par nom normalise : quand deux scripts portent le meme nom,
// le premier du classeur fait foi. Choisir au hasard entre deux versions d un
// meme script serait pire que de n en montrer aucune, mais dans le classeur
// ces doublons sont des copies identiques.
const byNormalizedName = new Map<string, AdScript>();
for (const script of scripts) {
  const key = normalizeName(script.adName);
  if (key && !byNormalizedName.has(key)) byNormalizedName.set(key, script);
}

/**
 * Script d une annonce.
 *
 * `adName` sert de repli quand l identifiant n est pas dans le classeur : la
 * meme creative relancee dans une nouvelle campagne prend un nouvel
 * identifiant Meta mais garde son nom.
 */
export function getAdScript(adId: string, adName?: string | null): AdScript | null {
  const direct = byAdId.get(adId);
  if (direct) return direct;
  if (!adName) return null;
  return byNormalizedName.get(normalizeName(adName)) ?? null;
}

/** Vrai si la creative a un script ecrit, par identifiant ou par nom. */
export function hasAdScript(adId: string, adName?: string | null): boolean {
  return getAdScript(adId, adName) !== null;
}

/** Publicites listees dans le classeur dont le script n a jamais ete ecrit. */
export const adsWithoutScript = scriptData.adsWithoutScript as AdScriptIndexEntry[];

/** Date de l import, affichee pour signaler un classeur qui a pris du retard. */
export const adScriptsGeneratedAt = scriptData.generatedAt as string;

export const adScriptsCount = scripts.length;

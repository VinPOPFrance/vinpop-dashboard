/**
 * Jetons de design partages par tout le dashboard.
 *
 * Avant le Lot 2, les memes valeurs hexadecimales etaient recopiees a la main
 * dans une cinquantaine de fichiers. Toute couleur ou rayon utilise par un
 * composant `ui/` doit desormais venir d'ici : c'est le seul endroit a modifier
 * pour faire evoluer la charte.
 */

export const colors = {
  /** Fond general de l'application. */
  appBackground: '#FAFAF8',
  /** Fond des cartes et des tableaux. */
  surface: '#FFFFFF',
  /** Fond des en-tetes de tableau et des zones neutres. */
  surfaceMuted: '#F5F4F0',
  /** Fond des champs de saisie. */
  surfaceInput: '#FBFAF8',
  /** Bordure standard (cartes, separateurs, champs). */
  border: '#E8E6E1',

  /** Texte principal (valeurs, titres). */
  text: '#1A1A1A',
  /** Texte secondaire (libelles, cellules de tableau). */
  textSecondary: '#6B6B6B',
  /** Texte tertiaire (aides, mentions discretes). */
  textMuted: '#9B9B9B',

  /** Bordeaux VinPop : couleur de marque, reservee aux etats actifs. */
  brand: '#722F37',
  /** Fond de l'element de navigation actif. */
  brandSurface: '#F8F0F1',
  /** Fond tres clair pour les lignes selectionnees. */
  brandTint: '#FFF6F7',
  /** Bordure des elements de marque (bouton logout). */
  brandBorder: '#F1DBDE',

  /** Etat sain. */
  good: '#2D6A4F',
  goodSurface: '#EDF7F3',
  /** Etat a surveiller. */
  warning: '#B45309',
  warningSurface: '#FEF3CD',
  /** Etat critique : necessite une action aujourd'hui. */
  critical: '#C0392B',
  criticalSurface: '#FDECEA',
  /** Information neutre. */
  info: '#2F5D8C',
  infoSurface: '#EDF2F9',
} as const;

export const radius = {
  sm: 6,
  md: 7,
  lg: 10,
  pill: 20,
} as const;

/** Tonalites d'alerte partagees par StatCard, StatusBadge et AlertBanner. */
export type Tone = 'default' | 'good' | 'warning' | 'critical' | 'info';

/** Traduit une tonalite en couple (texte, fond) issu des jetons ci-dessus. */
export function toneColors(tone: Tone): { color: string; background: string } {
  switch (tone) {
    case 'good':
      return { color: colors.good, background: colors.goodSurface };
    case 'warning':
      return { color: colors.warning, background: colors.warningSurface };
    case 'critical':
      return { color: colors.critical, background: colors.criticalSurface };
    case 'info':
      return { color: colors.info, background: colors.infoSurface };
    default:
      return { color: colors.text, background: colors.surfaceMuted };
  }
}

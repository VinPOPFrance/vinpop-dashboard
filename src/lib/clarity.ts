/**
 * Liens profonds vers la console Microsoft Clarity.
 *
 * Clarity n est pas synchronise dans PostgreSQL et n expose pas d API publique
 * de heatmaps : le dashboard ne peut donc pas afficher les cartes de chaleur.
 * Ce qu il peut faire, et qui couvre le besoin reel, c est envoyer l utilisateur
 * directement sur la bonne page de la console Clarity depuis la ligne du
 * tableau qui pose probleme.
 *
 * L identifiant de projet est lu cote serveur (`CLARITY_PROJECT_ID`) : ce n est
 * pas un secret, mais rien n oblige a l exposer au navigateur.
 */

/** Domaine public du site, pour reconstruire une URL absolue depuis un chemin. */
const SITE_ORIGIN = 'https://www.vinpop.nl';

const CLARITY_BASE = 'https://clarity.microsoft.com/projects/view';

export type ClarityLinks = {
  /** Vue d ensemble du projet. */
  dashboard: string;
  /** Carte de chaleur, pre-filtree sur la page quand c est possible. */
  heatmap: string;
  /** Enregistrements de sessions, pre-filtres sur la page. */
  recordings: string;
};

/** L identifiant de projet Clarity, ou null s il n est pas configure. */
export function getClarityProjectId(): string | null {
  const projectId = process.env.CLARITY_PROJECT_ID?.trim();
  return projectId ? projectId : null;
}

/**
 * Construit les trois liens Clarity pour un chemin de page GA4.
 *
 * Renvoie `null` si `CLARITY_PROJECT_ID` n est pas defini : mieux vaut ne pas
 * afficher de bouton que d en afficher un qui tombe sur une page d erreur.
 */
export function buildClarityLinks(pagePath: string): ClarityLinks | null {
  const projectId = getClarityProjectId();
  if (!projectId) {
    return null;
  }

  const absoluteUrl = `${SITE_ORIGIN}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`;
  const encoded = encodeURIComponent(absoluteUrl);
  const project = `${CLARITY_BASE}/${encodeURIComponent(projectId)}`;

  return {
    dashboard: `${project}/dashboard`,
    heatmap: `${project}/heatmaps?url=${encoded}`,
    recordings: `${project}/recordings?url=${encoded}`,
  };
}

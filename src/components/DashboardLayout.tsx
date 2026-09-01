import { Sidebar } from './Sidebar';
import { colors } from '@/components/ui';
import { getCachedLastAirbyteSync } from '@/lib/cachedDb';

/**
 * Ossature de toutes les pages protegees : barre laterale fixe a gauche,
 * contenu defilant a droite.
 *
 * C est aussi ici qu est lue la fraicheur des donnees, une fois par rendu de
 * page et en cache : la barre laterale est un composant client, elle ne peut
 * pas interroger la base elle-meme. Le libelle est calcule cote serveur pour
 * eviter tout ecart d hydratation entre le rendu serveur et le navigateur.
 */
export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const freshness = await getCachedLastAirbyteSync();
  const sync = freshness.ok ? describeFreshness(freshness.oldestSyncedAt) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.appBackground }}>
      <Sidebar
        syncLabel={sync?.label ?? 'Fraicheur indisponible'}
        syncStatus={sync?.status ?? 'unknown'}
        syncDetail={
          freshness.ok
            ? freshness.sources
                .map((entry) => `${entry.source} : ${formatSyncDate(entry.lastSyncedAt)}`)
                .join('\n')
            : 'La date de derniere synchronisation Airbyte n a pas pu etre lue.'
        }
      />
      <main style={{ flex: 1, minWidth: 0, paddingBottom: 40 }}>
        {children}
      </main>
    </div>
  );
}

/** Date lisible pour l info-bulle detaillant chaque source. */
function formatSyncDate(value: string | null): string {
  if (!value) return 'jamais';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Traduit la synchronisation la plus en retard en libelle et en niveau d alerte.
 *
 * Les seuils suivent le rythme attendu des connexions Airbyte : une
 * synchronisation par nuit. Au-dela de 48 h, les KPI affiches ne decrivent plus
 * la situation actuelle et le dashboard doit le dire clairement.
 */
function describeFreshness(oldestSyncedAt: string | null): {
  label: string;
  status: 'fresh' | 'late' | 'stale' | 'unknown';
} {
  if (!oldestSyncedAt) {
    return { label: 'Aucune synchronisation', status: 'unknown' };
  }

  const ageMs = Date.now() - new Date(oldestSyncedAt).getTime();
  const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
  const ageDays = Math.floor(ageHours / 24);

  const label =
    ageHours < 1 ? 'Sync : il y a moins d une heure'
    : ageHours < 24 ? `Sync : il y a ${ageHours} h`
    : ageDays === 1 ? 'Sync : il y a 1 jour'
    : `Sync : il y a ${ageDays} jours`;

  const status = ageHours < 24 ? 'fresh' : ageHours < 48 ? 'late' : 'stale';

  return { label, status };
}

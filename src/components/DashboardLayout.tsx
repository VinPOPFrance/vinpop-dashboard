import { Sidebar } from './Sidebar';
import { colors } from '@/components/ui';

/**
 * Ossature de toutes les pages protegees : barre laterale fixe a gauche,
 * contenu defilant a droite.
 *
 * La barre laterale est `sticky` sur toute la hauteur de l ecran (voir
 * `Sidebar`), donc seule la zone de contenu defile.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.appBackground }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, paddingBottom: 40 }}>
        {children}
      </main>
    </div>
  );
}

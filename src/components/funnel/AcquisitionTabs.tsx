import Link from 'next/link';
import { colors, radius } from '@/components/ui';

/**
 * Onglets Meta Ads / Google Ads de l etape 2.
 *
 * Les onglets passent par l URL (`?tab=`) plutot que par un etat React : la vue
 * reste rendue cote serveur, chaque onglet est partageable par lien, et le
 * selecteur de periode de l en-tete continue de fonctionner sans remise a zero.
 */

export type AcquisitionTab = 'meta' | 'google' | 'orders';

/** Lit l onglet demande, en retombant sur Meta si le parametre est absent ou invalide. */
export function parseAcquisitionTab(value: string | string[] | undefined): AcquisitionTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'google') return 'google';
  if (raw === 'orders') return 'orders';
  return 'meta';
}

export function AcquisitionTabs({
  active,
  searchParams,
}: {
  active: AcquisitionTab;
  /** Parametres courants, pour conserver la periode en changeant d onglet. */
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tabs: { id: AcquisitionTab; label: string; hint: string }[] = [
    { id: 'meta', label: 'Meta Ads', hint: 'Hook rate, cout par visite, creatives' },
    { id: 'google', label: 'Google Ads', hint: 'Cout par mot-cle et qualite du trafic achete' },
    { id: 'orders', label: 'Commandes', hint: 'Chaque vente encaissee et ce qui l a amenee' },
  ];

  function hrefFor(tab: AcquisitionTab): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'tab' || value === undefined) continue;
      next.set(key, Array.isArray(value) ? (value[0] ?? '') : value);
    }
    next.set('tab', tab);
    return `?${next.toString()}`;
  }

  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 32px', marginTop: 20 }}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            prefetch={false}
            title={tab.hint}
            style={{
              padding: '8px 16px',
              borderRadius: radius.md,
              border: `1px solid ${isActive ? colors.brand : colors.border}`,
              background: isActive ? colors.brandSurface : colors.surface,
              color: isActive ? colors.brand : colors.textSecondary,
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

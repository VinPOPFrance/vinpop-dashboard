import { colors, radius } from '@/components/ui';
import type { ClarityLinks } from '@/lib/clarity';

/**
 * Boutons Heatmap / Sessions vers la console Microsoft Clarity.
 *
 * Utilise par l etape 1 (pages a faible engagement) et l etape 4 (fiches
 * produit qui ne convertissent pas) : dans les deux cas, la question suivante
 * est la meme — qu est-ce que les visiteurs font reellement sur cette page.
 */
export function ClarityButtons({ links }: { links: ClarityLinks | null }) {
  if (!links) {
    return <span style={{ color: colors.textMuted, fontSize: 11 }}>non configure</span>;
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <ClarityButton href={links.heatmap} label="Heatmap" />
      <ClarityButton href={links.recordings} label="Sessions" />
    </span>
  );
}

function ClarityButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: radius.sm,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        color: colors.brand,
        fontSize: 11,
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      {label}
    </a>
  );
}

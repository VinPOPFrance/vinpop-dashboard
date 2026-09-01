'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, radius } from '@/components/ui';
import {
  ANNEX_GROUPS,
  ANNEX_HREFS,
  DATA_QUALITY_LINKS,
  FORECAST_LINKS,
  FUNNEL_STEPS,
  type NavLink,
} from '@/lib/navigation';
import { useState } from 'react';

/**
 * Barre laterale du dashboard.
 *
 * Organisee comme le parcours client : les 7 etapes du funnel dans l'ordre,
 * puis le module financier, puis les annexes repliees et le controle qualite
 * des donnees. La structure vient de `@/lib/navigation`.
 */

/** Libelle de section (Funnel, Forecast, Data Quality). */
function GroupLabel({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: muted ? '#C0C0C0' : colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '14px 10px 8px',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Lien de navigation.
 *
 * `marker` remplace les pictogrammes decoratifs d'avant : pour le funnel c'est
 * le numero de l'etape, ce qui rend l'ordre du parcours lisible d'un coup d'oeil.
 */
function NavItem({
  link,
  active,
  marker,
  size = 'normal',
}: {
  link: NavLink;
  active: boolean;
  marker?: React.ReactNode;
  size?: 'normal' | 'small';
}) {
  const small = size === 'small';

  return (
    <Link
      href={link.href}
      prefetch={false}
      title={link.hint}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: small ? '6px 10px' : '8px 10px',
        borderRadius: radius.md,
        textDecoration: 'none',
        color: active ? colors.brand : small ? colors.textMuted : colors.textSecondary,
        background: active ? colors.brandSurface : 'transparent',
        fontWeight: active ? 600 : 400,
        fontSize: small ? 12.5 : 13.5,
        marginBottom: 1,
        transition: 'all 0.1s',
      }}
    >
      {marker !== undefined ? (
        <span
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            borderRadius: radius.sm,
            background: active ? colors.brand : colors.surfaceMuted,
            color: active ? '#FFFFFF' : colors.textMuted,
            fontSize: 10.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {marker}
        </span>
      ) : null}
      {link.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  // Les annexes sont repliees par defaut, sauf si on consulte justement une
  // page annexe : sinon le lien actif serait invisible.
  const [annexesOpen, setAnnexesOpen] = useState(() => ANNEX_HREFS.has(pathname));

  return (
    <aside
      style={{
        width: 220,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: colors.brand,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>VinPop</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>Business Dashboard</div>
          </div>
        </div>
      </div>

      {/* Navigation : defilante, car les annexes depliees depassent la hauteur d ecran */}
      <nav style={{ padding: '4px 10px 12px', flex: 1, overflowY: 'auto' }}>
        <GroupLabel>Funnel client</GroupLabel>
        {FUNNEL_STEPS.map((step) => (
          <NavItem key={step.href} link={step} active={pathname === step.href} marker={step.step} />
        ))}

        <GroupLabel>Forecast</GroupLabel>
        {FORECAST_LINKS.map((link) => (
          <NavItem key={link.href} link={link} active={pathname === link.href} />
        ))}

        {/* Annexes : tout ce qui ne sert pas la lecture quotidienne du funnel */}
        <GroupLabel muted>Annexes</GroupLabel>
        <button
          type="button"
          onClick={() => setAnnexesOpen(!annexesOpen)}
          aria-expanded={annexesOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: radius.md,
            color: colors.textMuted,
            fontSize: 12.5,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 9, transform: annexesOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
          Anciennes pages
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#C0C0C0' }}>{ANNEX_HREFS.size}</span>
        </button>

        {annexesOpen
          ? ANNEX_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: '#C0C0C0', padding: '8px 10px 4px' }}>{group.title}</div>
                {group.links.map((link) => (
                  <NavItem key={link.href} link={link} active={pathname === link.href} size="small" />
                ))}
              </div>
            ))
          : null}

        <GroupLabel muted>Data Quality</GroupLabel>
        {DATA_QUALITY_LINKS.map((link) => (
          <NavItem key={link.href} link={link} active={pathname === link.href} size="small" />
        ))}
      </nav>

      {/* Pied : deconnexion */}
      <div style={{ borderTop: `1px solid ${colors.border}`, padding: '10px', flexShrink: 0 }}>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: radius.md,
              border: `1px solid ${colors.brandBorder}`,
              background: colors.brandTint,
              color: colors.brand,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13 }}>⇠</span>
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

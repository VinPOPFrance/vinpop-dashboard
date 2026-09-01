'use client';

import { useState } from 'react';
import { colors, radius } from './tokens';

/**
 * Bloc repliable.
 *
 * Deux usages : la section "Annexes" de la barre laterale, et les annexes
 * secondaires en bas des pages du funnel. Repliee par defaut, pour que la vue
 * principale ne montre que les 7 etapes.
 */
export function Collapsible({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Nombre d'elements caches, affiche a cote du titre quand c'est replie. */
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
          border: 'none',
          borderRadius: radius.md,
          color: colors.textSecondary,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, transition: 'transform 0.1s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        {title}
        {count !== undefined && !open ? (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.textMuted }}>{count}</span>
        ) : null}
      </button>
      {open ? <div>{children}</div> : null}
    </div>
  );
}

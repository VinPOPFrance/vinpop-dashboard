'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { colors, radius } from '@/components/ui';
import { FUNNEL_STEPS } from '@/lib/navigation';

/**
 * En-tete de page : titre, sous-titre, date du jour et selecteur de periode.
 *
 * `step` sert aux 7 etapes du funnel : il affiche la position dans le parcours
 * et les fleches precedent / suivant, pour que le dashboard se lise en sequence
 * plutot que comme une collection de pages independantes.
 */
export function TopBar({
  title,
  subtitle,
  step,
  showDateRange = true,
}: {
  title: string;
  subtitle?: string;
  /** Numero d etape, de 1 a 7. Absent pour les pages hors funnel. */
  step?: number;
  /** Les pages sans dimension temporelle (saisie des charges) le passent a false. */
  showDateRange?: boolean;
}) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const previous = step ? FUNNEL_STEPS.find((item) => item.step === step - 1) : undefined;
  const next = step ? FUNNEL_STEPS.find((item) => item.step === step + 1) : undefined;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '24px 32px 0',
        gap: 16,
        // Les deux champs de dates precises ajoutent une bonne moitie de
        // largeur au bloc de droite. Sans repli, il poussait le titre hors de
        // l ecran et faisait defiler toute la page horizontalement.
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        {step ? (
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.brand, letterSpacing: '0.06em', marginBottom: 4 }}>
            ETAPE {step} / {FUNNEL_STEPS.length}
          </div>
        ) : null}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0 }}>{title}</h1>
        {subtitle ? <p style={{ fontSize: 13, color: colors.textSecondary, margin: '4px 0 0' }}>{subtitle}</p> : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          flexWrap: 'wrap',
          marginLeft: 'auto',
        }}
      >
        {step ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <StepArrow href={previous?.href} label="←" title={previous ? `Etape ${previous.step} : ${previous.label}` : undefined} />
            <StepArrow href={next?.href} label="→" title={next ? `Etape ${next.step} : ${next.label}` : undefined} />
          </div>
        ) : null}
        <span style={{ fontSize: 12, color: colors.textMuted }}>{today}</span>
        {showDateRange ? (
          <Suspense fallback={<span style={{ fontSize: 12, color: colors.textSecondary }}>Last 7 days</span>}>
            <DateRangePicker />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

/** Fleche de navigation entre etapes, grisee aux extremites du funnel. */
function StepArrow({ href, label, title }: { href?: string; label: string; title?: string }) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: href ? colors.textSecondary : '#D5D3CE',
    fontSize: 13,
    textDecoration: 'none',
  };

  if (!href) {
    return <span style={style}>{label}</span>;
  }

  return (
    <Link href={href} prefetch={false} title={title} style={style}>
      {label}
    </Link>
  );
}

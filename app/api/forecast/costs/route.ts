import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getForecastSettings, updateForecastSettings } from '@/lib/db';

/**
 * Lecture et mise a jour des charges du module financier.
 *
 * Cette route n est PAS publique : elle n est pas listee dans les chemins
 * ouverts du middleware, elle exige donc le cookie du dashboard comme toutes
 * les pages protegees. C est la seule route du projet qui ecrit en base, et
 * elle n atteint que le schema `dashboard`.
 */

export const runtime = 'nodejs';

/** Corps attendu en PUT, avant validation. */
type UpdateBody = {
  costs?: unknown;
  assumptions?: unknown;
};

const MAX_BODY_BYTES = 16 * 1024;

/** Extrait les montants de charges, en ignorant toute entree malformee. */
function parseCosts(value: unknown): { id: number; amount: number }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const id = Number(record.id);
    const amount = Number(record.amount);
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(amount)) return [];
    return [{ id, amount }];
  });
}

/** Extrait les hypotheses, en ignorant toute entree malformee. */
function parseAssumptions(value: unknown): { key: string; value: number }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const key = typeof record.key === 'string' ? record.key.trim() : '';
    const numeric = Number(record.value);
    if (!key || key.length > 64 || !Number.isFinite(numeric)) return [];
    return [{ key, value: numeric }];
  });
}

export async function GET() {
  const result = await getForecastSettings();

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
  }

  return NextResponse.json({ ok: true, settings: result.settings }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const raw = await request.text();

  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload-too-large' }, { status: 413 });
  }

  let body: UpdateBody;
  try {
    body = JSON.parse(raw) as UpdateBody;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }

  const costs = parseCosts(body.costs);
  const assumptions = parseAssumptions(body.assumptions);

  if (!costs.length && !assumptions.length) {
    return NextResponse.json({ ok: false, reason: 'nothing-to-update' }, { status: 400 });
  }

  const result = await updateForecastSettings({ costs, assumptions });

  if (!result.ok) {
    const status = result.reason === 'invalid-input' ? 400 : 500;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json(
    { ok: true, updatedCosts: result.updatedCosts, updatedAssumptions: result.updatedAssumptions },
    { status: 200 },
  );
}

/**
 * Homepage hero copy versions, oldest first.
 *
 * The dashboard cannot read the Shopify theme repository at runtime, so this
 * registry is maintained by hand from the theme's Git history (208 commits,
 * Nov 2025 → Aug 2026). Two eras, because the homepage was rebuilt on 23 June 2026:
 *
 *   era 'theme-editor'  — hero was the `image-with-text-overlay` section; the copy
 *                         lives in `templates/index.json` settings. That file is
 *                         edited in the Shopify theme editor and only reaches Git
 *                         when someone syncs, so its dates are UPPER BOUNDS: the
 *                         text changed on or before the date shown.
 *
 *   era 'landing-section' — hero is the `vinpop-smart-box-landing` section; the copy
 *                         lives in `locales/en.default.json`
 *                         (`vinpop_smart_box_landing.hero.*` / `.cta.*`). Edited in
 *                         code, so the commit date is exact — but deploys are manual,
 *                         so a version can sit in Git before reaching vinpop.nl.
 *
 * To add a version: append it, set the previous entry's status to 'replaced',
 * and keep the array sorted oldest first. The page reverses it for display.
 */

export type CopyVersionStatus = 'replaced' | 'live' | 'unpublished';

export type CopyVersionEra = 'theme-editor' | 'landing-section';

/**
 * 'sync'   — captured when the theme was synced to Git; the change happened earlier.
 * 'commit' — the edit itself; publishing to the live theme can happen later.
 */
export type CopyVersionDatePrecision = 'sync' | 'commit';

export type CopyVersionField =
  | 'eyebrow'
  | 'audience'
  | 'title'
  | 'lead'
  | 'ctaPrimary'
  | 'ctaSecondary';

export type CopyVersion = {
  id: string;
  label: string;
  era: CopyVersionEra;
  status: CopyVersionStatus;
  datePrecision: CopyVersionDatePrecision;
  committedOn: string;
  commitSha: string;
  commitSubject: string;
  sourceFile: string;
  eyebrow: string | null;
  audience: string | null;
  titleBefore: string;
  /** Empty in the theme-editor era, where the headline was not split. */
  titleHighlight: string;
  lead: string | null;
  ctaPrimary: string;
  ctaSecondary: string | null;
  changedFields: CopyVersionField[];
  /** Short plain-language note on the editorial intent of the change. */
  angle: string;
};

const TEMPLATE_FILE = 'templates/index.json';
const LOCALE_FILE = 'locales/en.default.json';

export const homepageHeroVersions: CopyVersion[] = [
  {
    id: 'home_hero_v1',
    label: 'v1',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2025-11-18',
    commitSha: 'cb9d7c2',
    commitSubject: 'backup: pre-popup-enhancement snapshot',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: '98% YOU WILL LOVE Les Truffières because you loved Antech',
    titleHighlight: '',
    lead: null,
    ctaPrimary: 'Shop Now',
    ctaSecondary: null,
    changedFields: [],
    angle: 'Oldest state found in Git. Match-score angle naming two specific wines, generic shop button.',
  },
  {
    id: 'home_hero_v2',
    label: 'v2',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2025-12-14',
    commitSha: '34ad58c',
    commitSubject: 'sync: pull latest changes from theme 189762503043 (Shapes Live) - homepage updates',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: '94% YOU WILL LOVE BEDOBA because you loved Villa Loren',
    titleHighlight: '',
    lead: null,
    ctaPrimary: 'Shop Now',
    ctaSecondary: null,
    changedFields: ['title'],
    angle: 'Same match-score formula, different example wines and a lower percentage.',
  },
  {
    id: 'home_hero_v3',
    label: 'v3',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2026-01-29',
    commitSha: '824b1a5',
    commitSubject: 'BACKUP COMPLET - Systeme fonctionnel LIVE (29 Jan 2026)',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: 'Discover the wine that suits you, thanks to science.',
    titleHighlight: '',
    lead:
      '🚀 We replace subjective descriptions with laboratory expertise: our recommendation algorithm analyzes the real properties of the wine to guide you to the perfect bottle, with no bias whatsoever.🤝',
    ctaPrimary: 'Start the quiz',
    ctaSecondary: null,
    changedFields: ['title', 'lead', 'ctaPrimary'],
    angle: 'Drops the match score for a science pitch. First appearance of the quiz as the entry point.',
  },
  {
    id: 'home_hero_v4',
    label: 'v4',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2026-02-27',
    commitSha: '2614fd2',
    commitSubject: 'BACKUP 27-Feb-2026: Tasting system complete - Live theme working',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: 'Your taste is unique. Ignore the reviews and let science find your perfect wine',
    titleHighlight: '',
    lead:
      '🚀 Taste is 100% subjective, so why trust a stranger\'s opinion? Unlike traditional wine apps, we replace biased reviews with hard lab data. Our algorithm analyzes the true flavor profile of each bottle to guarantee a perfect mathematical match for YOUR palate. 🤝',
    ctaPrimary: 'Start the quiz',
    ctaSecondary: null,
    changedFields: ['title', 'lead'],
    angle: 'Adds the enemy — critics and review apps — while keeping the science promise.',
  },
  {
    id: 'home_hero_v5',
    label: 'v5',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2026-05-21',
    commitSha: 'aff0cb3',
    commitSubject: 'feat: DNA loading animation + Adrien authority block + GEO-optimized robots.txt',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: 'NEVER BUY THE WRONG BOTTLE OF WINE AGAIN',
    titleHighlight: '',
    lead:
      'You are not looking for the world\'s best wine. You are looking for your best next bottle. Start with one wine you love and get recommendations that fit your taste, not the crowd.',
    ctaPrimary: 'Start your taste profile',
    ctaSecondary: null,
    changedFields: ['title', 'lead', 'ctaPrimary'],
    angle: 'First pain-led headline, in caps. Science moves out of the title and into the paragraph.',
  },
  {
    id: 'home_hero_v6',
    label: 'v6',
    era: 'theme-editor',
    status: 'replaced',
    datePrecision: 'sync',
    committedOn: '2026-06-03',
    commitSha: 'd7f0e86',
    commitSubject: 'feat: Update survey page with new Google Form and adjust styling',
    sourceFile: TEMPLATE_FILE,
    eyebrow: null,
    audience: null,
    titleBefore: 'NEVER BUY THE WRONG BOTTLE OF WINE AGAIN',
    titleHighlight: '',
    lead:
      'You are not looking for the world\'s best wine. You are looking for your best next bottle. Start with one wine you love and get recommendations that fit your taste, not the crowd.',
    ctaPrimary: 'Claim My Calibration Kit',
    ctaSecondary: null,
    changedFields: ['ctaPrimary'],
    angle: 'Button only: a soft "taste profile" becomes a concrete product, the Calibration Kit.',
  },
  {
    id: 'home_hero_v7',
    label: 'v7',
    era: 'landing-section',
    status: 'replaced',
    datePrecision: 'commit',
    committedOn: '2026-06-23',
    commitSha: 'e16bae3',
    commitSubject: 'feat: Replace existing sections with VinPop Smart Box landing section',
    sourceFile: LOCALE_FILE,
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis — not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Taste Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'title', 'lead', 'ctaPrimary'],
    angle:
      'Homepage rebuilt on one custom section. Three commits landed that day as the template flipped back and forth.',
  },
  {
    id: 'home_hero_v8',
    label: 'v8',
    era: 'landing-section',
    status: 'replaced',
    datePrecision: 'commit',
    committedOn: '2026-07-14',
    commitSha: 'e7fa191',
    commitSubject: 'Refactor Taste Kit terminology to Test Kit across multiple sections and localization files',
    sourceFile: LOCALE_FILE,
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis — not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['ctaPrimary'],
    angle: 'Naming only: "Taste Kit" became "Test Kit". The headline did not move.',
  },
  {
    id: 'home_hero_v9',
    label: 'v9',
    era: 'landing-section',
    status: 'replaced',
    datePrecision: 'commit',
    committedOn: '2026-07-15',
    commitSha: '19f5cb7',
    commitSubject: 'feat: Update copywriting and brand color rules in development guidelines',
    sourceFile: LOCALE_FILE,
    eyebrow: 'Lab-analyzed wines • Built by a former winemaker',
    audience: null,
    titleBefore: 'Stop wasting money on wines you',
    titleHighlight: 'don’t like.',
    lead:
      'Start with 3 wines, rate what you receive, and unlock Smart Wine Boxes matched through lab analysis, not subjective tasting notes or wine snobbery.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['lead'],
    angle: 'Punctuation only: an em dash became a comma. Same message as v7 and v8.',
  },
  {
    id: 'home_hero_v10',
    label: 'v10',
    era: 'landing-section',
    status: 'replaced',
    datePrecision: 'commit',
    committedOn: '2026-08-17',
    commitSha: 'c9fc6c1',
    commitSubject: 'feat: Enhance landing page with new offer details and dynamic CTA updates',
    sourceFile: LOCALE_FILE,
    eyebrow: '150+ wines rated by customers • 99% happy with at least one bottle',
    audience: null,
    titleBefore: 'Tired of guessing which wine to buy?',
    titleHighlight: 'Start with your taste.',
    lead:
      'Three bottles. Honest ratings. A Smart Wine Box built around what you actually enjoy. Real customers have already rated more than 150 wines.',
    ctaPrimary: 'Start with the Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'title', 'lead'],
    angle: 'Swaps lab credibility for customer proof. Lived one day.',
  },
  {
    id: 'home_hero_v11',
    label: 'v11',
    era: 'landing-section',
    status: 'live',
    datePrecision: 'commit',
    committedOn: '2026-08-18',
    commitSha: '6d6c3c5',
    commitSubject: 'feat: Add comparison table and update landing page content for improved user engagement',
    sourceFile: LOCALE_FILE,
    eyebrow: 'Step 1 of 3 • Your 4th bottle is free',
    audience: null,
    titleBefore: 'Find the wines you will love.',
    titleHighlight: 'It starts with 3 bottles for €29.90.',
    lead:
      'Taste them at home and rate each one in ten seconds: Dislike, Like or Love. We measure your taste in our lab, and from then on every bottle we send is matched to it. No critics, no guessing. Free shipping and a Taste Guarantee.',
    ctaPrimary: 'Get my Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'title', 'lead', 'ctaPrimary'],
    angle: 'Desire-led instead of pain-led, price in the headline, free 4th bottle in the eyebrow.',
  },
  {
    id: 'home_hero_v12',
    label: 'v12',
    era: 'landing-section',
    status: 'unpublished',
    datePrecision: 'commit',
    committedOn: '2026-08-24',
    commitSha: '33b9ec9',
    commitSubject: 'feat: Update Smart Wine Box builder and enhance landing page content',
    sourceFile: LOCALE_FILE,
    eyebrow: 'Step 1 of 3',
    audience: 'For people who love wine, not wine status.',
    titleBefore: 'Stop wasting money on wine you don\'t like.',
    titleHighlight: 'Drink what you actually like.',
    lead: '3 wines for €29.90 to understand your taste. Then get a Smart Wine Box matched to what you like.',
    ctaPrimary: 'Get my Test Kit for €29.90',
    ctaSecondary: 'See how it works',
    changedFields: ['eyebrow', 'audience', 'title', 'lead'],
    angle: 'Returns to the v5 pain angle, shorter, with a new audience line above the headline.',
  },
];

export type CopyVersionPeriod = {
  version: CopyVersion;
  /** Inclusive start date, YYYY-MM-DD. */
  start: string;
  /** Exclusive end date, YYYY-MM-DD, or null while the version is still live. */
  end: string | null;
  /** Null for a version that never reached the live theme. */
  liveDays: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / MS_PER_DAY));
}

/**
 * Turns the version list into the periods each version was (approximately) live.
 * A version ends when the next published version lands. Unpublished versions get
 * no period at all, so they never absorb traffic that belonged to the live one.
 */
export function buildCopyVersionPeriods(versions: CopyVersion[], today: string): CopyVersionPeriod[] {
  const published = versions.filter((version) => version.status !== 'unpublished');

  return versions.map((version) => {
    if (version.status === 'unpublished') {
      return { version, start: version.committedOn, end: null, liveDays: null };
    }

    const index = published.findIndex((entry) => entry.id === version.id);
    const next = index >= 0 ? published[index + 1] : undefined;
    const end = next ? next.committedOn : null;

    return {
      version,
      start: version.committedOn,
      end,
      liveDays: daysBetween(version.committedOn, end ?? today),
    };
  });
}

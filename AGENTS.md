# VinPop Dashboard - Agent Instructions

This is the internal VinPop business dashboard.

The goal of this dashboard is to help answer every morning:
- where VinPop is losing money
- where customers are blocked in the funnel
- which KPI is weak
- what action should be taken today
- which follow-up tasks must not be forgotten

## Project context

This is a separate project from the Shopify theme.

Never modify files outside this repository.
Never touch the Shopify theme repository.
Never create or modify files in the Shopify project.

This dashboard is built with:
- Next.js App Router
- TypeScript
- Tailwind CSS
- mock data currently
- password protection with `DASHBOARD_PASSWORD`
- deployment on Vercel
- custom domain: `dashboard.vinpop.nl`

## Current status

The dashboard already has:
- design pages
- mock data
- sidebar navigation
- login page
- middleware password protection
- logout
- deployment on Vercel

Do not rebuild the design from scratch.
Do not remove the authentication system.
Do not expose secrets to the browser.

## Important Next.js instruction

This project uses a recent Next.js version with breaking changes.

Before editing Next.js routing, middleware, server actions, route handlers, or config, read the relevant local docs in:

`node_modules/next/dist/docs/`

Use the conventions of the installed version, not assumptions from older Next.js versions.

## Data connection goal

We are now starting the real data connection step by step.

Data sources:
- PostgreSQL database populated by Airbyte
- Shopify data from Airbyte
- Meta Ads data from Airbyte
- VinPop server data such as quiz events and product ratings

The first objective is NOT to build every KPI.
The first objective is to safely connect to PostgreSQL server-side and display one simple test value.

## Rules for database work

Never expose `DATABASE_URL` to the browser.
Never use `NEXT_PUBLIC_DATABASE_URL`.
Database queries must run server-side only.
Use environment variables.
Do not hardcode credentials.
Do not mutate production data unless explicitly asked.
Start with read-only queries.
Prefer small, verifiable steps.

## Required environment variables

Local `.env.local` should contain:

```env
DASHBOARD_PASSWORD=your-dashboard-password
DATABASE_URL=your-postgres-connection-string
```

Vercel Production environment variables should contain:
- `DASHBOARD_PASSWORD`
- `DATABASE_URL`

## Step-by-step rule

Do not implement many steps at once.

For each task:
1. Explain what will be changed.
2. Change the minimum number of files.
3. Run the relevant local check.
4. Stop and summarize.
5. Wait for confirmation before continuing.

## Synchronisation Git (obligatoire - travail sur deux ordinateurs)

Ce projet est developpe depuis deux ordinateurs differents.
Le depot GitHub `VinPOPFrance/vinpop-dashboard` (branche `main`) est la
**seule source de verite**. Un dossier local n'est jamais considere comme a jour
tant qu'il n'a pas ete compare a GitHub.

### Regle absolue : verifier AVANT de modifier quoi que ce soit

Au debut de chaque session, avant de lire ou modifier le moindre fichier :

```bash
npm run sync:check
```

Le script affiche `OK` uniquement si les trois conditions sont reunies :
- aucun fichier modifie non commite
- aucun commit de retard sur `origin/main`
- aucun commit d'avance non pousse

**Si le script n'affiche pas `OK`, ne commence aucune modification.**
Signale l'ecart a l'utilisateur et attends sa decision.

### Que faire selon le resultat

| Resultat | Signification | Action |
|---|---|---|
| `OK` | Local identique a GitHub | Travailler normalement |
| `N commit(s) de retard` | L'autre ordinateur a pousse du travail | `npm run sync:pull` puis relancer `sync:check` |
| `N commit(s) d'avance` | Du travail local n'est pas sur GitHub | `npm run sync:push` |
| `fichier(s) modifie(s)` | Travail en cours non commite | Commiter ou demander a l'utilisateur |
| Retard **et** avance | Les deux postes ont diverge | **S'arreter.** Ne jamais forcer. Demander a l'utilisateur |

Ne jamais utiliser `git push --force`, `git reset --hard` ou `git checkout --`
sans demande explicite de l'utilisateur : cela detruirait le travail fait sur
l'autre ordinateur.

### Regle a la fin de chaque session

Ne jamais laisser du travail uniquement en local : l'autre ordinateur ne le
verra pas et les deux postes divergeront.

```bash
git add -A
git commit -m "description du changement"
npm run sync:push
npm run sync:check   # doit afficher OK
```

### Structure des dossiers

Le dossier de travail est le depot Git lui-meme. Il ne doit exister
**qu'une seule copie** du projet par ordinateur. Ne jamais dupliquer le projet
dans un dossier voisin non versionne : une copie sans `.git` ne peut pas etre
synchronisee et provoque exactement le probleme que ce document evite.

Fichiers volontairement absents de GitHub (voir `.gitignore`) et donc a recreer
manuellement sur chaque ordinateur :
- `.env.local` (contient `DASHBOARD_PASSWORD` et `DATABASE_URL`)
- `node_modules/` (recree avec `npm install`)

Les fins de ligne sont normalisees en LF via `.gitattributes`. Ne pas modifier
ce fichier : sans lui, un poste en CRLF ferait apparaitre tout le projet comme
modifie alors que le contenu est identique.

## Commands

Use these commands when relevant:

```bash
npm run dev
npm run lint
npm run build
git status --short
npm run sync:check
```

## Immediate next technical goal

Implement a minimal PostgreSQL connection test.

Expected first result:
- create a server-side database helper
- create one test page or route that runs `SELECT now()`
- display the database time on a protected dashboard page
- no client-side database access
- no complex KPI logic yet

After that works, we will inspect the Airbyte tables and progressively build clean SQL views.
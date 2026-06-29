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

## Commands

Use these commands when relevant:

```bash
npm run dev
npm run lint
npm run build
git status --short
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
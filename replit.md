# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Cross-platform mobile finance tracking app built with Expo React Native + Express API + PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo (SDK 54) + React Native + Expo Router (file-based routing)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI (via Replit AI Integrations) for natural language finance queries

## App Features

1. **Home Dashboard** — Balance card (navy gradient), income/expense summary, recent transactions with swipe-to-delete
2. **Statistics** — Custom SVG donut chart (spending by category) + bar chart (monthly trends)
3. **Add Transaction** — Full form with type toggle, category chips, amount, description, date, notes
4. **Smart Query (AI)** — Natural language questions about your finances powered by GPT-5.2
5. **Profile** — User settings with dark/light mode toggle

## Design

- Primary: Navy blue (#1B2B6B / #2D45A0 dark)
- Income: Green (#22C55E)
- Expense: Red (#EF4444)
- Background light: #F0F4FF
- Background dark: #0A0F23
- Font: Inter (400/500/600/700)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (transactions, stats, AI query)
│   └── finance-app/        # Expo React Native mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection (transactions table)
│   ├── integrations-openai-ai-server/  # OpenAI server-side client
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

All under `/api`:
- `GET /healthz` — health check
- `GET /transactions?month&year&category&type` — list transactions
- `POST /transactions` — create transaction
- `GET /transactions/:id` — get transaction
- `DELETE /transactions/:id` — delete transaction
- `GET /summary?month&year` — financial summary (balance, income, expenses)
- `GET /stats/categories?month&year` — spending by category
- `GET /stats/monthly?year` — monthly income vs expense trend
- `POST /ai/query` — natural language finance query via GPT-5.2

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`)
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Key Packages

### `artifacts/finance-app` (`@workspace/finance-app`)
Expo React Native mobile app. File-based routing via Expo Router.
- Entry: `app/_layout.tsx` — providers, font loading, base URL setup
- Tabs: `app/(tabs)/_layout.tsx` — NativeTabs (iOS 26+) or classic Tabs fallback
- `pnpm --filter @workspace/finance-app run dev` — run Expo dev server

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. All business logic and database access.
- `pnpm --filter @workspace/api-server run dev` — run dev server

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM. Schema: `transactions` table.
- `pnpm --filter @workspace/db run push` — push schema changes

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval config. Run codegen after spec changes:
- `pnpm --filter @workspace/api-spec run codegen`

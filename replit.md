# Workspace

## Overview

pnpm workspace monorepo — cross-platform mobile finance tracker built with **Expo React Native**, using **local SQLite** (expo-sqlite + Drizzle ORM on native) and **localStorage** (on web preview). No backend server required; everything runs on-device.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo (SDK 54) + React Native + Expo Router (file-based routing)
- **Database (native)**: expo-sqlite (async API) + Drizzle ORM — local SQLite on device
- **Database (web preview)**: localStorage — platform-specific hook files bypass expo-sqlite
- **AI**: On-device JS engine (`utils/localFinanceAI.ts`) — no API calls, fully offline

## App Features

1. **Home Dashboard** — Fixed header + scrollable transaction list. Orange balance card, income/expense summary cards, swipe-to-delete transactions. Auto-seeds 8 sample transactions on first launch.
2. **Statistics** — SVG donut chart (spending by category) + monthly cash flow bar chart. Month/year selector.
3. **Add Transaction** — Full form: type toggle (income/expense), category chips, amount, description, date picker, notes.
4. **Finance Query (On-Device AI)** — Natural language questions answered instantly using pure JS pattern matching. Works offline, no API key, private.
5. **Profile** — User settings, dark/light mode toggle.

## Design

- Primary orange: `#F97316` (light) / `#FB923C` (dark)
- Background: `#FFFFFF` (light) / `#000000` (dark)
- Card background: `#FFF8F3` (light) / `#141414` (dark)
- Income green: `#22C55E` | Expense red: `#EF4444`
- Font: Inter (400/500/600/700)

## Structure

```text
artifacts/finance-app/
├── app/
│   ├── _layout.tsx           # Root layout: font loading, DB init (native only)
│   └── (tabs)/
│       ├── _layout.tsx       # Tab bar config
│       ├── index.tsx         # Home dashboard
│       ├── stats.tsx         # Statistics screen
│       ├── add.tsx           # Add transaction form
│       ├── search.tsx        # On-device AI query screen
│       └── profile.tsx       # Profile / settings
├── components/               # TransactionItem, ErrorBoundary, etc.
├── constants/colors.ts       # Orange/white/black theme tokens
├── db/
│   ├── index.ts              # Web stub (no-op, used on web preview)
│   ├── index.native.ts       # expo-sqlite + Drizzle setup (iOS/Android)
│   └── schema.ts             # Drizzle schema (transactions, budgets, AI tables)
├── drizzle/                  # SQL migration files + migrations.js bundle
├── hooks/
│   ├── useDatabase.ts        # Web: localStorage-based hooks (no SQLite)
│   └── useDatabase.native.ts # Native: Drizzle ORM hooks (expo-sqlite)
├── utils/localFinanceAI.ts   # On-device AI engine — pure JS, 12+ query types
└── metro.config.js           # .sql + .wasm extensions for Metro bundler
```

## Platform-Specific Data Layer

Metro resolves `.native.ts` files for iOS/Android and falls back to `.ts` for web:

| File | Platform | Storage |
|------|----------|---------|
| `db/index.native.ts` | iOS / Android | expo-sqlite (async API) |
| `db/index.ts` | Web | No-op stub |
| `hooks/useDatabase.native.ts` | iOS / Android | Drizzle ORM over expo-sqlite |
| `hooks/useDatabase.ts` | Web | localStorage (in-memory cache + persistence) |

> **Why**: `expo-sqlite` on web requires OPFS/SharedArrayBuffer (COOP/COEP headers) which Replit's proxy strips. The web version uses localStorage so the preview works without those headers.

## DB Init Flow (Native)

`_layout.tsx` runs on mount:
1. `openDatabase()` → opens `fintrack.db` via `openDatabaseAsync` (no SharedArrayBuffer)
2. Each CREATE TABLE statement executed directly via `expo.execAsync()` (bypasses drizzle's sync migrate dialect which also needs SharedArrayBuffer)
3. `initializeFTS()` → FTS5 virtual table + triggers + indexes
4. `setDbReady(true)` → app renders

## On-Device AI

`utils/localFinanceAI.ts` — `queryFinances(question, transactions[])`:
- Pure JS, no imports, no network calls
- Handles: spending totals, category breakdown, savings rate, biggest expense, trends, budget advice, income summary, cash flow, financial health, comparisons, recent activity, and general advice
- Returns structured `AIResponse` with insights array

## Seeding

On first launch (AsyncStorage flag `@finance_app_seeded_v1` not set), 8 sample transactions are inserted via `useCreateTransaction`. Flag prevents double-seeding across sessions.

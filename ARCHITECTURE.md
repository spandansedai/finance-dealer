# Technical Architecture

- **Stack**: Next.js 14+ / 16 (App Router), TypeScript, Tailwind CSS, Supabase, Recharts.
- **Data Flow**: NEPSE Collector -> Supabase Cache DB -> Pure Math Calculations -> Dashboard UI -> AI Explanation Layer.
- **Core Rule**: Do not query NEPSE APIs directly from the browser UI. Keep calculation logic inside `lib/calculations/`.

## Directory Structure
- `app/`: Routing and layouts
  - `(root)` / `dashboard`: Dashboard overview
  - `portfolio`: NEPSE stock portfolio tracking
  - `expenses`: Monthly and categorized expense management
  - `salary`: Salary, tax bracket, and earnings calculator
- `lib/`:
  - `calculations/`: Pure math calculations (savings rate, net savings, gain/loss)
  - `database/`: Database clients and caching logic
  - `market-data/`: NEPSE market data models
- `components/`: Reusable React UI components
- `types/`: Shared domain interfaces and types

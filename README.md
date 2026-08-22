# Nepali Personal Finance & NEPSE OS

A lightweight personal finance app for tracking salary, monthly expenses, and NEPSE stock portfolios.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: Recharts
- **Database / Auth**: Supabase (Planned v0.4)

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure
- `app/`: Next.js App Router pages (`/`, `/dashboard`, `/portfolio`, `/expenses`, `/salary`)
- `lib/calculations/`: Pure mathematical calculation engine for financial metrics
- `lib/database/`: Database client & schema queries (Supabase)
- `lib/market-data/`: NEPSE market data models and caching layer
- `components/`: Modular, reusable UI components
- `types/`: Shared TypeScript type definitions

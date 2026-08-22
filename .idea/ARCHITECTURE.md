# Technical Architecture
- Stack: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase, Recharts.
- Data Flow: NEPSE Collector -> Supabase Cache DB -> Pure Math Calculations -> Dashboard UI -> AI Explanation Layer.
- Core Rule: Do not query NEPSE APIs directly from the browser UI. Keep calculation logic inside `lib/calculations/`.
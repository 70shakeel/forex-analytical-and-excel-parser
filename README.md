# ForexAnalytics

**Live site:** https://forex-analytical-and-excel-parser.vercel.app/

## 📸 Screenshots

![Landing Page](https://image.thum.io/get/width/1280/crop/800/https://forex-analytical-and-excel-parser.vercel.app/)

![Features Section](https://image.thum.io/get/width/1280/crop/800/https://forex-analytical-and-excel-parser.vercel.app/#features)


Statistical edge tools for currency traders. Fetch live OHLC data, analyze daily ranges, visualize technical indicators, and track your trades — all in one dashboard.

## Features

- **Live market data** — fetches up to 120 days of OHLC candles via Twelve Data
- **Symbol autocomplete** — searchable list of majors, crosses, commodities, and crypto with recent search history
- **Range analytics** — average, median, max daily range in pips; day-of-week breakdown
- **Trading chart** — candlestick chart with EMA, Bollinger Bands, RSI, and MACD overlays
- **Excel export** — one-click copy of the data table, paste directly into Excel
- **Trade journal** — log trades with entry, TP, SL, quantity, direction, chart screenshot, and notes; mark TP/SL outcomes; track PnL and win rate per portfolio
- **Portfolios** — create multiple portfolios, invite collaborators by email with editor or viewer roles
- **Auth** — email/password sign-up and login, forgot/reset password flow (Supabase Auth)

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — Auth, Postgres database, Storage
- [Twelve Data](https://twelvedata.com) — forex/crypto market data API
- [lightweight-charts](https://tradingview.github.io/lightweight-charts/) — TradingView charting library
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS

## Database Schema

| Table | Description |
|---|---|
| `public.users` | User profiles, auto-created on sign-up |
| `public.search_history` | Per-user symbol search history (max 10 shown) |
| `public.portfolios` | Trade portfolios with name and initial equity |
| `public.portfolio_members` | Per-portfolio membership with roles (`owner`, `editor`, `viewer`) and invite status |
| `public.trades` | Individual trade entries with symbol, direction, entry/TP/SL, quantity, PnL, status, and optional chart screenshot |

All tables have RLS enabled — users can only access their own rows or portfolios they are members of.

## Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the environment variables:

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key
- `TWELVE_DATA_API_KEY` — your Twelve Data API key

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for local dev, or visit the live site at https://forex-analytical-and-excel-parser.vercel.app/

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Sign in |
| `/register` | Create account |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password (via email link) |
| `/dashboard` | Main analytics dashboard (auth required) |
| `/journal` | Trade journal — view trades and portfolio stats (auth required) |
| `/journal/new` | Log a new trade |
| `/portfolios/new` | Create a new portfolio |
| `/portfolios/[id]/settings` | Manage portfolio name and members (owner only) |

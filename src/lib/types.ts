export interface Portfolio {
  id: string
  name: string
  owner_id: string
  initial_equity: number
  created_at: string
}

export interface PortfolioMember {
  id: string
  portfolio_id: string
  user_id: string | null
  invited_email: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'pending' | 'active'
  invited_at: string
}

export interface Trade {
  id: string
  portfolio_id: string
  symbol: string
  direction: 'long' | 'short'
  entry: number
  tp: number | null
  sl: number | null
  order_quantity: number
  pnl: number | null
  status: 'open' | 'tp_hit' | 'sl_hit'
  chart_url: string | null
  notes: string | null
  traded_at: string
  created_at: string
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewPortfolioPage() {
  const [name, setName] = useState('')
  const [initialEquity, setInitialEquity] = useState('10000')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not signed in'); setLoading(false); return }

    const { data, error } = await supabase.from('portfolios').insert({
      name,
      owner_id: user.id,
      initial_equity: parseFloat(initialEquity),
    }).select().single()

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Portfolio created')
    router.push(`/journal?portfolio=${data.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/journal">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
          </Link>
          <h1 className="text-xl font-bold">New Portfolio</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Portfolio Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                  placeholder="My Forex Portfolio" required className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Initial Equity ($)</Label>
                <Input value={initialEquity} onChange={e => setInitialEquity(e.target.value)}
                  type="number" step="0.01" min="0" required className="h-10 font-mono" />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                {loading ? 'Creating…' : 'Create Portfolio'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

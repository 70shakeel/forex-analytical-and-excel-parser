'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Portfolio, PortfolioMember } from '@/lib/types'

function roleBadge(role: string) {
  if (role === 'owner') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Owner</Badge>
  if (role === 'editor') return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Editor</Badge>
  return <Badge className="bg-muted text-muted-foreground border-border">Viewer</Badge>
}

function statusBadge(status: string) {
  if (status === 'active') return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>
  return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">Pending</Badge>
}

export default function PortfolioSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [members, setMembers] = useState<PortfolioMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [portfolioName, setPortfolioName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('portfolios').select('*').eq('id', id).single(),
        supabase.from('portfolio_members').select('*').eq('portfolio_id', id).order('invited_at'),
      ])
      if (!p) { router.push('/journal'); return }
      setPortfolio(p)
      setPortfolioName(p.name)
      setMembers(m ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    const supabase = createClient()
    const { error } = await supabase.from('portfolio_members').insert({
      portfolio_id: id,
      invited_email: inviteEmail.toLowerCase(),
      role: inviteRole,
      status: 'pending',
    })
    if (error) {
      toast.error(error.message.includes('unique') ? 'This email is already invited' : error.message)
      setInviting(false)
      return
    }
    toast.success(`Invited ${inviteEmail}`)
    setInviteEmail('')
    // Refresh members
    const { data: m } = await supabase.from('portfolio_members').select('*').eq('portfolio_id', id).order('invited_at')
    setMembers(m ?? [])
    setInviting(false)
  }

  async function changeRole(memberId: string, role: 'editor' | 'viewer') {
    const supabase = createClient()
    const { error } = await supabase.from('portfolio_members').update({ role }).eq('id', memberId)
    if (error) { toast.error(error.message); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    toast.success('Role updated')
  }

  async function removeMember(memberId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('portfolio_members').delete().eq('id', memberId)
    if (error) { toast.error(error.message); return }
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success('Member removed')
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    const supabase = createClient()
    const { error } = await supabase.from('portfolios').update({ name: portfolioName }).eq('id', id)
    if (error) { toast.error(error.message); setSavingName(false); return }
    setPortfolio(prev => prev ? { ...prev, name: portfolioName } : prev)
    toast.success('Name updated')
    setSavingName(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>

  const nonOwnerMembers = members.filter(m => m.role !== 'owner')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/journal?portfolio=${id}`}>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
        </Link>
        <h1 className="text-xl font-bold">Portfolio Settings</h1>
      </div>

      {/* Name */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Portfolio Name</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex gap-2">
            <Input value={portfolioName} onChange={e => setPortfolioName(e.target.value)} required className="h-9" />
            <Button type="submit" disabled={savingName} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {savingName ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Members</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-card">
                <div className="min-w-0">
                  <p className="text-sm truncate">{m.invited_email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusBadge(m.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {m.role === 'owner' ? roleBadge('owner') : (
                    <>
                      <Select value={m.role} onValueChange={v => changeRole(m.id, v as 'editor' | 'viewer')}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <button onClick={() => removeMember(m.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite member</p>
            <div className="flex gap-2">
              <Input
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com" type="email" required className="h-9 flex-1" />
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as 'editor' | 'viewer')}>
                <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={inviting} size="sm"
                className="h-9 bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                {inviting ? 'Inviting…' : 'Invite'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">They'll get access once they sign up or sign in with this email.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

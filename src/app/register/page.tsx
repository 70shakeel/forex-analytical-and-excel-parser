'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { TrendingUp, MailCheck, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/login`,
      },
    })
    if (error) {
      toast.error(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  const mailProvider =
    domain.includes('gmail') ? { label: 'Open Gmail', href: 'https://mail.google.com' } :
    domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn') ? { label: 'Open Outlook', href: 'https://outlook.live.com' } :
    domain.includes('yahoo') ? { label: 'Open Yahoo Mail', href: 'https://mail.yahoo.com' } :
    domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com') ? { label: 'Open Mail', href: 'https://www.icloud.com/mail' } :
    null

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.<br />
            Click it to activate your account.
          </p>
          {mailProvider && (
            <a
              href={mailProvider.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full h-10 leading-10 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-bold rounded-md transition-colors"
            >
              {mailProvider.label}
            </a>
          )}
          <Link href="/login" className="inline-block text-sm text-emerald-400 hover:underline mt-2">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-emerald-400" />
            <span className="text-2xl font-bold">ForexAnalytics</span>
          </div>
          <p className="text-muted-foreground text-sm">Start analysing your edge for free</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-xl font-bold">Create account</h1>
            <p className="text-muted-foreground text-sm mt-1">Free forever — no credit card needed</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

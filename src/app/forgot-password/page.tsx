'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { TrendingUp, MailCheck, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
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

  if (sent) {
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
            We sent a password reset link to{' '}
            <span className="text-foreground font-medium">{email}</span>.
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
          <Link href="/login" className="inline-block text-sm text-emerald-400 hover:underline">
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
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-xl font-bold">Reset password</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Button
              type="submit"
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

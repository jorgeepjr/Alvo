'use client'

import { useState } from 'react'
import { signIn } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-[#0e141b]/80 backdrop-blur-xl shadow-[0_0_50px_oklch(0.75_0.13_233_/_0.16)]">
        <CardHeader className="space-y-3 text-center">
          <img src="/brand/zynk-logo-branco.png" alt="ZYNK" className="h-10 w-auto mx-auto" />
          <p className="text-sm text-zinc-400">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Nome</Label>
              <Input id="usuario" name="usuario" type="text" autoComplete="username" autoCapitalize="none" placeholder="Seu nome" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required className="bg-slate-800 border-slate-700" />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button type="submit" className="w-full bg-zinc-100 text-zinc-950 hover:bg-white font-medium" disabled={loading}>
              {loading ? 'Aguarde...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

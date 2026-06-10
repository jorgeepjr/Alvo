'use client'

import { useState } from 'react'
import { signIn } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="text-3xl font-bold text-indigo-400 mb-1">🎯</div>
          <CardTitle className="text-2xl font-bold">Alvo</CardTitle>
          <p className="text-sm text-muted-foreground">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required className="bg-slate-800 border-slate-700" />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={loading}>
              {loading ? 'Aguarde...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

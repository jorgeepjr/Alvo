'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { projetarMesIA } from './actions'

export function ProjecaoIA() {
  const [analise, setAnalise] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function gerar() {
    setLoading(true)
    setErro(null)
    const r = await projetarMesIA()
    if (r.error) setErro(r.error)
    else setAnalise(r.analise ?? null)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <Button onClick={gerar} disabled={loading} variant="outline">
        {loading ? 'Analisando...' : analise ? 'Gerar novamente' : '🔮 Projetar o mês com IA (sazonalidade)'}
      </Button>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {analise && (
        <div className="rounded-md border border-white/10 bg-[#0c1014] p-4 text-sm text-zinc-200 whitespace-pre-wrap">
          {analise}
        </div>
      )}
    </div>
  )
}

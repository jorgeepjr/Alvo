'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { gerarAnaliseSemanal } from './actions'

export function AnaliseSemanal() {
  const [analise, setAnalise] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function gerar() {
    setLoading(true)
    setErro(null)
    const resultado = await gerarAnaliseSemanal()
    if (resultado.error) setErro(resultado.error)
    else setAnalise(resultado.analise ?? null)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <Button onClick={gerar} disabled={loading} className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">
        {loading ? 'Analisando...' : analise ? 'Gerar novamente' : '✨ Gerar análise da semana (IA)'}
      </Button>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {analise && (
        <div className="rounded-md border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200 whitespace-pre-wrap">
          {analise}
        </div>
      )}
    </div>
  )
}

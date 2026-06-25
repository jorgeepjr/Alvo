'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { gerarEstrategiaCampanha } from './actions'

export function EstrategiaCampanha({ id, estrategia }: { id: string; estrategia: string | null }) {
  const [texto, setTexto] = useState<string | null>(estrategia)
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    setLoading(true)
    setErro(null)
    const r = await gerarEstrategiaCampanha(id)
    if (r.error) setErro(r.error)
    else if (r.estrategia) {
      setTexto(r.estrategia)
      setAberto(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <Button onClick={gerar} disabled={loading} size="sm" variant="outline">
          {loading ? 'Gerando...' : texto ? '↻ Refazer estratégia (IA)' : '✨ Gerar estratégia (IA)'}
        </Button>
        {texto && (
          <Button onClick={() => setAberto((v) => !v)} size="sm" variant="outline">
            {aberto ? 'Ocultar' : 'Ver estratégia'}
          </Button>
        )}
      </div>
      {erro && <p className="text-sm text-red-400 mt-2">{erro}</p>}
      {aberto && texto && (
        <div className="mt-2 rounded-md border border-white/10 bg-[#0c1014] p-3 text-sm text-zinc-200 whitespace-pre-wrap">
          {texto}
        </div>
      )}
    </div>
  )
}

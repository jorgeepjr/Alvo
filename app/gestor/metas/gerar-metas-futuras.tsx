'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { gerarMetasFuturas } from './actions'

export function GerarMetasFuturas({ ano, mes }: { ano: number; mes: number }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function gerar() {
    setLoading(true)
    setMsg(null)
    const fd = new FormData()
    fd.set('ano', String(ano))
    fd.set('mes', String(mes))
    const r = await gerarMetasFuturas(fd)
    setMsg(
      r.criadas > 0
        ? `✅ ${r.criadas} cota(s) futura(s) criada(s) com base no histórico. Navegue pelos meses para revisar e ajustar.`
        : 'Nenhuma cota nova criada (já estão definidas ou faltam dados do ano anterior).'
    )
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Button onClick={gerar} disabled={loading} variant="outline">
        {loading ? 'Gerando...' : '📅 Gerar cotas dos próximos 12 meses (com base no histórico)'}
      </Button>
      {msg && <p className="text-sm text-zinc-300">{msg}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { analisarPerguntasVendedores } from './actions'

export function InsightsPerguntas() {
  const [analise, setAnalise] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function gerar() {
    setLoading(true)
    setErro(null)
    const resultado = await analisarPerguntasVendedores()
    if (resultado.error) setErro(resultado.error)
    else setAnalise(resultado.analise ?? null)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        A IA analisa as perguntas que os vendedores fizeram ao assistente e resume os temas mais
        frequentes, dúvidas e oportunidades de melhoria para a loja.
      </p>
      <Button onClick={gerar} disabled={loading} className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">
        {loading ? 'Analisando...' : analise ? 'Gerar novamente' : '💡 Analisar perguntas dos vendedores (IA)'}
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

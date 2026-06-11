'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { enviarMensagemAssistente, type ChatMessage } from './actions'

const SUGESTOES = [
  'Me dê 3 ideias de vídeo para hoje destacando uma peça parada no estoque',
  'Crie uma campanha de condicional para o fim de semana',
  'Como aumentar o número de peças por atendimento?',
  'Ideias de combos/looks para aumentar o ticket médio',
]

export function ChatAssistente() {
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, loading])

  async function enviar(texto: string) {
    const conteudo = texto.trim()
    if (!conteudo || loading) return

    const novoHistorico: ChatMessage[] = [...mensagens, { role: 'user', content: conteudo }]
    setMensagens(novoHistorico)
    setInput('')
    setErro(null)
    setLoading(true)

    const resultado = await enviarMensagemAssistente(novoHistorico)

    if (resultado.error) {
      setErro(resultado.error)
    } else if (resultado.resposta) {
      setMensagens([...novoHistorico, { role: 'assistant', content: resultado.resposta }])
    }

    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {mensagens.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={`rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-indigo-600/20 text-indigo-100 ml-auto max-w-[85%]'
                : 'bg-slate-800 text-slate-200 max-w-[85%]'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="rounded-md px-3 py-2 text-sm bg-slate-800 text-slate-400 max-w-[85%]">
            Pensando...
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar(input)
        }}
        className="flex gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar(input)
            }
          }}
          placeholder="Pergunte algo, ex: ideia de vídeo para hoje..."
          rows={2}
          className="bg-slate-800 border-slate-700"
        />
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500" disabled={loading}>
          Enviar
        </Button>
      </form>
    </div>
  )
}

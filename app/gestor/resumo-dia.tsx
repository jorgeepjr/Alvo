'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ResumoDia({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-2">
      <pre className="whitespace-pre-wrap rounded-md border border-white/10 bg-[#0c1014] p-3 text-sm text-zinc-200 font-sans">
        {texto}
      </pre>
      <Button onClick={copiar} size="sm" className="bg-zinc-100 text-zinc-950 hover:bg-white font-medium">
        {copiado ? '✓ Copiado!' : '📋 Copiar para o WhatsApp'}
      </Button>
    </div>
  )
}

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, ChevronRight } from 'lucide-react'
import { MANUAIS } from '@/lib/manuais-conteudo'

export default function ManuaisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manuais e Treinamento</h1>
        <p className="text-sm text-zinc-400">
          Materiais oficiais da ZYNK. Toque para ler direto no sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MANUAIS.map((m) => (
          <Link key={m.slug} href={`/painel/manuais/${m.slug}`}>
            <Card className="border-white/10 bg-[#11161b] hover:border-white/25 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-lg bg-white/5 p-3">
                  <FileText className="h-6 w-6 text-zinc-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-zinc-100">{m.titulo}</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">{m.descricao}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

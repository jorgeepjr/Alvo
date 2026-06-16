import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MANUAIS, getManual, type Bloco } from '@/lib/manuais-conteudo'

export function generateStaticParams() {
  return MANUAIS.map((m) => ({ slug: m.slug }))
}

function RenderBloco({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'paragrafo':
      return <p className="text-sm text-zinc-300 leading-relaxed">{bloco.texto}</p>
    case 'subtitulo':
      return <p className="text-sm font-semibold text-zinc-100 mt-2">{bloco.texto}</p>
    case 'citacao':
      return (
        <p className="text-sm italic text-zinc-200 border-l-2 border-zinc-600 pl-3">{bloco.texto}</p>
      )
    case 'lista':
      return (
        <ul className="space-y-1.5">
          {bloco.itens.map((item, i) => (
            <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
              <span className="text-zinc-500 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
  }
}

export default async function ManualPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const manual = getManual(slug)
  if (!manual) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/painel/manuais" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar aos manuais
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{manual.titulo}</h1>
        <p className="text-sm text-zinc-400">{manual.descricao}</p>
      </div>

      <div className="space-y-4">
        {manual.secoes.map((secao, i) => (
          <Card key={i} className="border-white/10 bg-[#11161b]">
            <CardContent className="py-5 space-y-3">
              <h2 className="text-base font-semibold text-zinc-100">{secao.titulo}</h2>
              <div className="space-y-3">
                {secao.blocos.map((bloco, j) => (
                  <RenderBloco key={j} bloco={bloco} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

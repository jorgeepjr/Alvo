import { Card, CardContent } from '@/components/ui/card'
import { FileText, Download } from 'lucide-react'

const MANUAIS = [
  {
    titulo: 'Rotina de Vendas',
    descricao: 'A rotina diária de vendas da loja, passo a passo.',
    arquivo: '/manuais/rotina-de-vendas.pdf',
  },
  {
    titulo: 'Cartilha de Conduta',
    descricao: 'Padrões de conduta, postura e atendimento ZYNK.',
    arquivo: '/manuais/cartilha-de-conduta.pdf',
  },
  {
    titulo: 'Manual do Instagram',
    descricao: 'Como usar o Instagram da loja para atrair e vender.',
    arquivo: '/manuais/manual-do-instagram.pdf',
  },
  {
    titulo: 'Manual de Postagens',
    descricao: 'Guia de postagens: temas, frequência e padrão visual.',
    arquivo: '/manuais/manual-de-postagens.pdf',
  },
  {
    titulo: 'Diagnóstico',
    descricao: 'Diagnóstico e direcionamento estratégico da marca.',
    arquivo: '/manuais/diagnostico.pdf',
  },
]

export default function ManuaisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manuais e Treinamento</h1>
        <p className="text-sm text-zinc-400">
          Materiais oficiais da ZYNK. Toque para abrir ou baixar no celular.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MANUAIS.map((m) => (
          <Card key={m.arquivo} className="border-white/10 bg-[#11161b] hover:border-white/25 transition-colors">
            <CardContent className="flex items-start gap-4 py-5">
              <div className="rounded-lg bg-white/5 p-3">
                <FileText className="h-6 w-6 text-zinc-200" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-zinc-100">{m.titulo}</h2>
                <p className="text-sm text-zinc-400 mt-0.5">{m.descricao}</p>
                <div className="flex gap-3 mt-3">
                  <a
                    href={m.arquivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-100 underline underline-offset-4 hover:text-white"
                  >
                    Abrir
                  </a>
                  <a
                    href={m.arquivo}
                    download
                    className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

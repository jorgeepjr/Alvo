import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatAssistente } from './chat-assistente'

export default function AssistenteIAPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assistente IA</h1>
      <p className="text-sm text-slate-400">
        Peça sugestões de campanhas, promoções, ideias de vídeos para Instagram/TikTok, dicas de
        abordagem e combinações de looks para vender mais.
      </p>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatAssistente />
        </CardContent>
      </Card>
    </div>
  )
}

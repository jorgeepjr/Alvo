type Mensagem = { role: 'user' | 'assistant'; content: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Modelos em ordem de preferência: se um estiver fora do ar/sem cota, tenta o próximo.
const MODELOS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest']

// Chama a API gratuita do Google Gemini (AI Studio) via REST, sem dependências.
// Tenta novamente em caso de sobrecarga (503/429/500) e troca de modelo se preciso.
export async function chamarGemini(
  apiKey: string,
  system: string,
  mensagens: Mensagem[]
): Promise<string> {
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: mensagens.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 1200 },
  }

  let ultimoStatus = 0

  for (const modelo of MODELOS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`

    // Até 2 tentativas por modelo (para sobrecarga momentânea).
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const json = await res.json()
        const texto: string =
          json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
        if (!texto) throw new Error('Resposta vazia do Gemini')
        return texto
      }

      const erro = await res.text()
      ultimoStatus = res.status
      console.error(`Gemini ${modelo} ${res.status} (tentativa ${tentativa}):`, erro)

      // Chave inválida não adianta tentar de novo nem trocar modelo.
      if (res.status === 400 && erro.includes('API key not valid')) throw new Error('CHAVE_INVALIDA')

      // Sobrecarga momentânea: espera e tenta de novo no mesmo modelo.
      if ((res.status === 503 || res.status === 500) && tentativa < 2) {
        await sleep(1200)
        continue
      }
      // Caso contrário (429 sem cota, 503 persistente), passa para o próximo modelo.
      break
    }
  }

  if (ultimoStatus === 429) throw new Error('LIMITE_EXCEDIDO')
  if (ultimoStatus === 503) throw new Error('SOBRECARREGADO')
  throw new Error(`Gemini API ${ultimoStatus}`)
}

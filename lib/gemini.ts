type Mensagem = { role: 'user' | 'assistant'; content: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Chama a API gratuita do Google Gemini (AI Studio) via REST, sem dependências.
// Tenta novamente automaticamente quando o servidor do Google está sobrecarregado (503).
export async function chamarGemini(
  apiKey: string,
  system: string,
  mensagens: Mensagem[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: mensagens.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 1200 },
  }

  const MAX_TENTATIVAS = 3
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
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
    console.error(`Gemini API ${res.status} (tentativa ${tentativa}):`, erro)

    if (res.status === 400 && erro.includes('API key not valid')) throw new Error('CHAVE_INVALIDA')
    if (res.status === 429) throw new Error('LIMITE_EXCEDIDO')

    // 503 (sobrecarregado) ou 500: espera um pouco e tenta de novo.
    if ((res.status === 503 || res.status === 500) && tentativa < MAX_TENTATIVAS) {
      await sleep(1500 * tentativa)
      continue
    }

    if (res.status === 503) throw new Error('SOBRECARREGADO')
    throw new Error(`Gemini API ${res.status}`)
  }

  throw new Error('SOBRECARREGADO')
}

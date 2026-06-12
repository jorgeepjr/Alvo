type Mensagem = { role: 'user' | 'assistant'; content: string }

// Chama a API gratuita do Google Gemini (AI Studio) via REST, sem dependências.
export async function chamarGemini(
  apiKey: string,
  system: string,
  mensagens: Mensagem[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: mensagens.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 1200 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const erro = await res.text()
    console.error(`Gemini API ${res.status}:`, erro)
    if (res.status === 400 && erro.includes('API key not valid')) {
      throw new Error('CHAVE_INVALIDA')
    }
    if (res.status === 429) {
      throw new Error('LIMITE_EXCEDIDO')
    }
    throw new Error(`Gemini API ${res.status}`)
  }

  const json = await res.json()
  const texto: string =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''

  if (!texto) throw new Error('Resposta vazia do Gemini')
  return texto
}

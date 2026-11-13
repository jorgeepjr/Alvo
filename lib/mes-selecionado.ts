import { cookies } from 'next/headers'
import { hojeBR, validaYm, ymDe } from '@/lib/datas'

export const COOKIE_MES = 'mf_mes'

/**
 * Mês que vale pra tela toda (seletor lá em cima). Ordem: ?mes= da URL,
 * depois o cookie da sessão, depois o mês de hoje.
 */
export async function mesSelecionado(sp?: { mes?: string }): Promise<string> {
  const daUrl = validaYm(sp?.mes)
  if (daUrl) return daUrl
  const store = await cookies()
  return validaYm(store.get(COOKIE_MES)?.value) ?? ymDe(hojeBR())
}

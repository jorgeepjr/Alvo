'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const ERRO = 'Usuário ou senha inválidos.'
const normaliza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Login pelo NOME (pedido do Junior, 13/11/2026). O Supabase só autentica por
// e-mail, então o servidor acha o e-mail de quem tem esse nome e entra com a
// senha digitada. Quem digitar um e-mail continua entrando do jeito antigo.
async function emailDoUsuario(usuario: string): Promise<string | null> {
  if (usuario.includes('@')) return usuario
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: perfis } = await admin.from('profiles').select('id, nome').eq('ativo', true)
  const alvo = normaliza(usuario)
  const achados = (perfis ?? []).filter((p) => normaliza(p.nome ?? '') === alvo)
  if (achados.length !== 1) return null // nenhum ou nome repetido: precisa usar o e-mail
  const { data } = await admin.auth.admin.getUserById(achados[0].id)
  return data?.user?.email ?? null
}

export async function signIn(formData: FormData) {
  const usuario = String(formData.get('usuario') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!usuario || !password) return { error: ERRO }

  const email = await emailDoUsuario(usuario)

  // Nome que não existe também passa pelo Supabase (com um e-mail que não existe),
  // pra resposta demorar igual e não entregar quais nomes têm conta.
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: email ?? 'ninguem@metaflow.invalid', password })
  if (error || !email) return { error: ERRO }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

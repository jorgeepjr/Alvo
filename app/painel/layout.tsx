import { createClient } from '@/lib/supabase/server'
import { SidebarVendedor } from '@/components/sidebar-vendedor'
import { SidebarGestor } from '@/components/sidebar-gestor'

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user!.id).maybeSingle()
  const isGestor = profile?.perfil === 'gestor'

  return (
    <div className="flex h-screen bg-[#0c1014] overflow-hidden">
      {isGestor ? <SidebarGestor /> : <SidebarVendedor />}
      <div className="flex-1 overflow-y-auto p-4 pt-20 md:p-6">{children}</div>
    </div>
  )
}

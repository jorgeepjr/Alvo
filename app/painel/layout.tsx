import { SidebarVendedor } from '@/components/sidebar-vendedor'

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <SidebarVendedor />
      <div className="flex-1 overflow-y-auto p-4 pt-20 md:p-6">{children}</div>
    </div>
  )
}

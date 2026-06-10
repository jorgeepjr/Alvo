import { SidebarGestor } from '@/components/sidebar-gestor'

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <SidebarGestor />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import {
  LayoutDashboard,
  Users,
  Target,
  FilePlus,
  BarChart3,
  Upload,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Sparkles,
  TrendingUp,
  BookOpen,
  HelpCircle,
} from 'lucide-react'

const links = [
  { href: '/gestor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gestor/vendedores', label: 'Vendedores', icon: Users },
  { href: '/gestor/metas', label: 'Metas', icon: Target },
  { href: '/gestor/lancamento', label: 'Lançamento', icon: FilePlus },
  { href: '/gestor/tarefas', label: 'Rotina Diária', icon: ListChecks },
  { href: '/gestor/engajamento', label: 'Engajamento', icon: TrendingUp },
  { href: '/painel/assistente', label: 'Assistente IA', icon: Sparkles },
  { href: '/painel/manuais', label: 'Manuais', icon: BookOpen },
  { href: '/gestor/historico', label: 'Histórico', icon: BarChart3 },
  { href: '/gestor/importar', label: 'Importar', icon: Upload },
  { href: '/gestor/ajuda', label: 'Manual do Sistema', icon: HelpCircle },
]

export function SidebarGestor() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <>
      {/* Barra superior — somente celular */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0c1014] px-4 py-3">
        <button onClick={() => setMobileOpen(true)} className="text-zinc-300" aria-label="Abrir menu">
          <Menu className="h-6 w-6" />
        </button>
        <Image src="/brand/zynk-logo-branco.png" alt="ZYNK" width={90} height={28} className="h-6 w-auto" priority />
      </div>

      {/* Overlay — somente celular, quando o menu está aberto */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex h-full flex-col border-r border-white/10 bg-[#0c1014] transition-transform duration-200 md:transition-[width] md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-16' : 'md:w-60'} w-60 shrink-0`}
      >
        <div className="flex items-center justify-between p-4 h-16">
          {!collapsed ? (
            <Image src="/brand/zynk-logo-branco.png" alt="ZYNK" width={110} height={32} className="h-7 w-auto" priority />
          ) : (
            <Image src="/brand/zynk-icone-branco.png" alt="ZYNK" width={28} height={28} className="h-6 w-auto mx-auto" priority />
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex text-zinc-500 hover:text-white"
            aria-label="Recolher menu"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-zinc-100 text-zinc-950 font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </Link>
            )
          })}
        </nav>
        <form action={signOut} className="p-2">
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sair'}
          </button>
        </form>
      </aside>
    </>
  )
}

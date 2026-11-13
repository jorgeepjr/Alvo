'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import {
  LayoutDashboard,
  Users,
  Target,
  FilePlus,
  BarChart3,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  HelpCircle,
  Settings,
  Banknote,
} from 'lucide-react'

// Menu enxuto (repaginada de 12/11/2026). Campanhas, desafios, assistente,
// tarefas avulsas e engajamento saíram do menu, sem apagar nada: ficam em
// Ajustes → "Guardado pra depois".
const grupos = [
  { nome: 'Hoje', cor: '#22d3ee', links: [
    { href: '/gestor', label: 'Início', icon: LayoutDashboard },
    { href: '/gestor/lancamento', label: 'Lançar vendas', icon: FilePlus },
  ] },
  { nome: 'Metas', cor: '#a78bfa', links: [
    { href: '/gestor/metas', label: 'Metas', icon: Target },
    { href: '/gestor/comissoes', label: 'Comissão', icon: Banknote },
  ] },
  { nome: 'Equipe', cor: '#34d399', links: [
    { href: '/gestor/vendedores', label: 'Vendedores', icon: Users },
    { href: '/gestor/rotina', label: 'Rotina (hábitos)', icon: ListChecks },
  ] },
  { nome: 'Análise', cor: '#fbbf24', links: [
    { href: '/gestor/historico', label: 'Histórico', icon: BarChart3 },
  ] },
  { nome: 'Ajustes', cor: '#94a3b8', links: [
    { href: '/gestor/ajustes', label: 'Ajustes', icon: Settings },
    { href: '/gestor/ajuda', label: 'Ajuda', icon: HelpCircle },
  ] },
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
        <img src="/brand/zynk-logo-branco.png" alt="ZYNK" className="h-6 w-auto" />
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
            <img src="/brand/zynk-logo-branco.png" alt="ZYNK" className="h-7 w-auto" />
          ) : (
            <img src="/brand/zynk-icone-branco.png" alt="ZYNK" className="h-6 w-auto mx-auto" />
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex text-zinc-500 hover:text-white"
            aria-label="Recolher menu"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2">
          {grupos.map((g) => (
            <div key={g.nome} className="mb-1">
              {!collapsed && (
                <div className="mx-2 mb-1 mt-3 flex items-center gap-1.5 text-[10.5px] uppercase tracking-widest text-slate-500">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: g.cor }} />
                  {g.nome}
                </div>
              )}
              {g.links.map(({ href, label, icon: Icon }) => {
                const active = href === '/gestor' ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? 'font-semibold' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                    style={active ? { background: `${g.cor}22`, color: g.cor, boxShadow: `inset 3px 0 0 ${g.cor}` } : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
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

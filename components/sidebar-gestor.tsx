'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import { LayoutDashboard, Users, Target, FilePlus, BarChart3, Upload, LogOut } from 'lucide-react'

const links = [
  { href: '/gestor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gestor/vendedores', label: 'Vendedores', icon: Users },
  { href: '/gestor/metas', label: 'Metas', icon: Target },
  { href: '/gestor/lancamento', label: 'Lançamento', icon: FilePlus },
  { href: '/gestor/historico', label: 'Histórico', icon: BarChart3 },
  { href: '/gestor/importar', label: 'Importar', icon: Upload },
]

export function SidebarGestor() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
      <div className="p-4 text-xl font-bold text-indigo-400">🎯 MetaFlow</div>
      <nav className="flex-1 px-2 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <form action={signOut} className="p-2">
        <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </aside>
  )
}

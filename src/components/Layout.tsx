import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { usePrivacy } from '../lib/privacy'
import { Logo } from './Logo'
import { IconGrid, IconTree, IconSwap, IconChart, IconSliders, IconEye } from './icons'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconGrid, end: true },
  { to: '/posizioni', label: 'Posizioni', icon: IconTree },
  { to: '/transazioni', label: 'Transazioni', icon: IconSwap },
  { to: '/analisi', label: 'Analisi', icon: IconChart },
  { to: '/impostazioni', label: 'Impostazioni', icon: IconSliders },
]

function initialsFromEmail(email: string | undefined) {
  if (!email) return '?'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [local[0], local[1] ?? '']
  return chars.join('').toUpperCase()
}

export default function Layout() {
  const { session } = useAuth()
  const { hidden, toggle } = usePrivacy()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[240px] flex-none flex-col self-start overflow-y-auto border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-6 py-[22px] text-lg font-semibold tracking-tight">
          <Logo size={28} />
          DashFinanza
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  isActive
                    ? 'bg-primary-active font-medium text-primary'
                    : 'text-text-secondary hover:bg-background'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="border-t border-border px-5 py-3 text-left text-xs text-text-secondary hover:text-text"
        >
          Esci
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center gap-4 border-b border-border bg-surface px-4 md:px-6">
          <div className="flex items-center gap-2 text-base font-semibold tracking-tight md:hidden">
            <Logo size={24} />
            DashFinanza
          </div>
          <div className="flex-1" />
          <button
            onClick={toggle}
            title="Privacy"
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${hidden ? 'bg-primary-active text-primary' : 'text-text-tertiary'}`}
          >
            <IconEye />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-active text-[13px] font-semibold text-primary">
            {initialsFromEmail(session?.user.email)}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">
          <div className="mx-auto max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
                isActive ? 'font-medium text-primary' : 'text-text-secondary'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

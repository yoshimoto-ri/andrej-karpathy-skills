import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLE_LABEL = { admin: '管理員', field_worker: '田間作業員', sales: '產銷人員' }

const NAV = [
  { to: '/', label: '📊 總覽', roles: ['admin', 'field_worker', 'sales'] },
  { section: '基礎資料', roles: ['admin'] },
  { to: '/admin/materials', label: '🧪 資材庫', roles: ['admin'] },
  { to: '/admin/purchases', label: '🛒 資材採購', roles: ['admin'] },
  { to: '/admin/fields', label: '🗺️ 田區管理', roles: ['admin'] },
  { to: '/admin/crop-types', label: '🌱 作物設定', roles: ['admin'] },
  { to: '/admin/contracts', label: '📄 契作合約', roles: ['admin'] },
  { to: '/admin/users', label: '👥 帳號管理', roles: ['admin'] },
  { section: '田間作業', roles: ['admin', 'field_worker'] },
  { to: '/field/cycles', label: '🌾 栽種週期', roles: ['admin', 'field_worker'] },
  { to: '/field/env', label: '🌤️ 環境紀錄', roles: ['admin', 'field_worker'] },
  { to: '/field/activities', label: '📝 田間作業', roles: ['admin', 'field_worker'] },
  { to: '/field/losses', label: '⚠️ 農損紀錄', roles: ['admin', 'field_worker', 'sales'] },
  { section: '產銷管理', roles: ['admin', 'sales'] },
  { to: '/sales/harvests', label: '🧺 採收紀錄', roles: ['admin', 'sales'] },
  { to: '/sales/processing', label: '📦 洗選包裝', roles: ['admin', 'sales'] },
  { to: '/sales/shipments', label: '🚚 出貨管理', roles: ['admin', 'sales'] },
  { section: '報表', roles: ['admin', 'sales'] },
  { to: '/reports', label: '📑 報表中心', roles: ['admin', 'sales'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const role = profile?.role
  const items = NAV.filter(i => i.roles.includes(role))

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item, i) =>
        item.section ? (
          <p key={i} className="text-xs font-semibold text-gray-400 px-3 pt-4 pb-1">{item.section}</p>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-green-50'
              }`}>
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  )

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top bar */}
      <header className="bg-green-800 text-white sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 h-14">
          <button className="md:hidden text-2xl leading-none" onClick={() => setOpen(v => !v)}>☰</button>
          <h1 className="font-bold">🌱 農業生產管理系統</h1>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden sm:inline opacity-80">
              {profile?.name || profile?.email}（{ROLE_LABEL[role]}）
            </span>
            <button onClick={signOut} className="bg-white/15 rounded-lg px-3 py-1.5">登出</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <aside className="hidden md:block w-56 border-r border-gray-200 bg-white shrink-0">
          <div className="sticky top-14">{nav}</div>
        </aside>

        {/* Sidebar - mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white overflow-y-auto pt-14"
              onClick={e => e.stopPropagation()}>
              {nav}
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

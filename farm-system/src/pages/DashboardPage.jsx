import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    (async () => {
      const count = (table, filter) => {
        let q = supabase.from(table).select('*', { count: 'exact', head: true })
        if (filter) q = filter(q)
        return q.then(r => r.count ?? 0)
      }
      const [fields, materials, cycles, locked] = await Promise.all([
        count('fields', q => q.eq('is_active', true)),
        count('materials', q => q.eq('is_active', true)),
        count('crop_cycles', q => q.eq('status', 'growing')),
        count('crop_cycles', q => q.eq('status', 'growing').gte('harvest_locked_until', new Date().toISOString().slice(0, 10))),
      ])
      setStats({ fields, materials, cycles, locked })
    })()
  }, [])

  const cards = [
    { label: '使用中田區', value: stats?.fields, icon: '🗺️' },
    { label: '資材品項', value: stats?.materials, icon: '🧪' },
    { label: '生長中作物', value: stats?.cycles, icon: '🌾' },
    { label: '採收鎖定中', value: stats?.locked, icon: '🔒', warn: true },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-gray-800">
          您好，{profile?.name || profile?.email} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="card p-4">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className={`text-2xl font-bold ${c.warn && c.value > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {c.value ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {stats?.locked > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          ⚠️ 有 {stats.locked} 個田區作物仍在用藥安全隔離期內，暫時無法採收。
        </p>
      )}
    </div>
  )
}

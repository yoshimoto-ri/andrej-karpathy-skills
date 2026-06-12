import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'

const ROLE_LABEL = { admin: '管理員', field_worker: '田間作業員', sales: '產銷人員' }

export default function UsersPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">帳號管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          新成員請自行於登入頁註冊，再由管理員在此調整角色與啟用狀態。
        </p>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-gray-400 text-sm">載入中...</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="th">姓名</th><th className="th">電子信箱</th>
                <th className="th">角色</th><th className="th">狀態</th><th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="td">{r.name || '—'}</td>
                  <td className="td">{r.email}</td>
                  <td className="td">{ROLE_LABEL[r.role]}</td>
                  <td className="td">{r.is_active ? '✅ 啟用' : '⛔ 停用'}</td>
                  <td className="td text-right">
                    <button className="text-green-700 text-sm font-medium"
                      onClick={() => setEditing(r)}>編輯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <UserForm row={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

function UserForm({ row, onClose, onSaved }) {
  const [name, setName] = useState(row.name || '')
  const [role, setRole] = useState(row.role)
  const [isActive, setIsActive] = useState(row.is_active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    const { error } = await supabase.from('profiles')
      .update({ name, role, is_active: isActive }).eq('id', row.id)
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal title="編輯帳號" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label">電子信箱</label>
          <input className="input" value={row.email} disabled />
        </div>
        <div>
          <label className="label">姓名</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="顯示名稱" />
        </div>
        <div>
          <label className="label">角色</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value)}>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="w-4 h-4 accent-green-700"
            checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          啟用此帳號
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>取消</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

// 通用 CRUD 頁面
// columns: [{ key, label, render?(row) }]
// fields:  [{ name, label, type, options?, required?, placeholder?, hint? }]
//   type: text | number | date | select | textarea | checkbox
export default function CrudPage({
  table, title, columns, fields,
  select = '*', orderBy = 'created_at', ascending = false,
  canWrite = true, canDelete = true,
  transformPayload, emptyText = '尚無資料',
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { row? }
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from(table).select(select).order(orderBy, { ascending })
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }, [table, select, orderBy, ascending])

  useEffect(() => { load() }, [load])

  const handleDelete = async (row) => {
    if (!confirm('確定要刪除這筆資料？')) return
    const { error } = await supabase.from(table).delete().eq('id', row.id)
    if (error) { alert('刪除失敗：' + error.message); return }
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        {canWrite && (
          <button className="btn-primary" onClick={() => setModal({})}>+ 新增</button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-gray-400 text-sm">載入中...</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">{emptyText}</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {columns.map(c => <th key={c.key} className="th">{c.label}</th>)}
                {(canWrite || canDelete) && <th className="th" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => (
                <tr key={row.id}>
                  {columns.map(c => (
                    <td key={c.key} className="td">
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                  {(canWrite || canDelete) && (
                    <td className="td text-right">
                      {canWrite && (
                        <button className="text-green-700 text-sm font-medium mr-3"
                          onClick={() => setModal({ row })}>編輯</button>
                      )}
                      {canDelete && (
                        <button className="text-red-500 text-sm"
                          onClick={() => handleDelete(row)}>刪除</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <CrudForm
          title={modal.row ? `編輯${title}` : `新增${title}`}
          table={table} fields={fields} row={modal.row}
          transformPayload={transformPayload}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

export function CrudForm({ title, table, fields, row, transformPayload, onClose, onSaved }) {
  const init = {}
  for (const f of fields) init[f.name] = row?.[f.name] ?? (f.type === 'checkbox' ? false : '')
  const [values, setValues] = useState(init)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (name, v) => setValues(prev => ({ ...prev, [name]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    let payload = {}
    for (const f of fields) {
      let v = values[f.name]
      if (v === '') v = null
      payload[f.name] = v
    }
    if (transformPayload) payload = transformPayload(payload, row)
    const q = row
      ? supabase.from(table).update(payload).eq('id', row.id)
      : supabase.from(table).insert(payload)
    const { error } = await q
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {fields.map(f => (
          <div key={f.name}>
            {f.type !== 'checkbox' && <label className="label">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>}
            {f.type === 'select' ? (
              <select className="input" required={f.required}
                value={values[f.name] ?? ''} onChange={e => set(f.name, e.target.value)}>
                <option value="">請選擇</option>
                {(f.options || []).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea className="input" rows={3} required={f.required}
                placeholder={f.placeholder}
                value={values[f.name] ?? ''} onChange={e => set(f.name, e.target.value)} />
            ) : f.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="w-4 h-4 accent-green-700"
                  checked={!!values[f.name]} onChange={e => set(f.name, e.target.checked)} />
                {f.label}
              </label>
            ) : (
              <input className="input" type={f.type || 'text'} required={f.required}
                step={f.type === 'number' ? 'any' : undefined}
                maxLength={f.maxLength} placeholder={f.placeholder}
                value={values[f.name] ?? ''} onChange={e => set(f.name, e.target.value)} />
            )}
            {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
          </div>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 mt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>取消</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

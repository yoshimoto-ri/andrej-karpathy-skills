import { useState } from 'react'
import { useFarm } from '../../contexts/FarmContext'
import { ACTIVITY_TYPES } from '../../lib/constants'

const WEATHERS = ['晴', '多雲', '陰', '雨', '不記錄']
const UNITS = ['公升', '毫升', '公斤', '公克', '台斤', '瓶', '包', '袋', '次']

const today = () => new Date().toISOString().split('T')[0]

function MaterialRow({ item, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 flex gap-2">
        <input
          value={item.name} onChange={e => onChange(index, 'name', e.target.value)}
          placeholder="資材名稱"
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <input
          type="number" value={item.quantity} onChange={e => onChange(index, 'quantity', e.target.value)}
          placeholder="用量"
          className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <select
          value={item.unit} onChange={e => onChange(index, 'unit', e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-1 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => onRemove(index)} className="text-red-400 text-lg leading-none pt-2">×</button>
    </div>
  )
}

export default function ActivityForm({ initial = null, onSubmit, onCancel }) {
  const { fields, crops } = useFarm()
  const [data, setData] = useState({
    record_date: initial?.record_date || today(),
    field_id: initial?.field_id || fields[0]?.id || '',
    crop_id: initial?.crop_id || '',
    activity_type: initial?.activity_type || '整地',
    weather: initial?.weather || '晴',
    description: initial?.description || '',
    notes: initial?.notes || '',
    materials: initial?.materials || [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }))

  const fieldCrops = crops.filter(c => c.field_id === data.field_id && c.status === 'active')

  const addMaterial = () => set('materials', [...data.materials, { name: '', quantity: '', unit: '公升' }])
  const updateMaterial = (i, k, v) => {
    const m = [...data.materials]
    m[i] = { ...m[i], [k]: v }
    set('materials', m)
  }
  const removeMaterial = (i) => set('materials', data.materials.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const payload = {
        ...data,
        crop_id: data.crop_id || null,
        materials: data.materials.filter(m => m.name.trim()),
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4 pb-24">
      {/* Date */}
      <div>
        <label className="label">作業日期</label>
        <input type="date" value={data.record_date} onChange={e => set('record_date', e.target.value)}
          required className="input" />
      </div>

      {/* Field */}
      <div>
        <label className="label">田區 *</label>
        <select value={data.field_id} onChange={e => { set('field_id', e.target.value); set('crop_id', '') }}
          required className="input">
          <option value="">請選擇田區</option>
          {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Crop */}
      <div>
        <label className="label">作物（選填）</label>
        <select value={data.crop_id} onChange={e => set('crop_id', e.target.value)} className="input">
          <option value="">— 不指定 —</option>
          {fieldCrops.map(c => <option key={c.id} value={c.id}>{c.name}{c.variety ? `（${c.variety}）` : ''}</option>)}
        </select>
      </div>

      {/* Activity Type */}
      <div>
        <label className="label">農事類型 *</label>
        <div className="grid grid-cols-5 gap-2">
          {ACTIVITY_TYPES.map(t => (
            <button key={t} type="button"
              onClick={() => set('activity_type', t)}
              className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                data.activity_type === t
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="label">天氣</label>
        <div className="flex gap-2 flex-wrap">
          {WEATHERS.map(w => (
            <button key={w} type="button"
              onClick={() => set('weather', w)}
              className={`px-4 py-2 rounded-full text-sm border-2 transition-colors ${
                data.weather === w
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">使用資材</label>
          <button type="button" onClick={addMaterial}
            className="text-green-600 text-sm font-medium">+ 新增資材</button>
        </div>
        {data.materials.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-3 bg-gray-50 rounded-xl">無使用資材</p>
        )}
        <div className="flex flex-col gap-2">
          {data.materials.map((m, i) => (
            <MaterialRow key={i} item={m} index={i} onChange={updateMaterial} onRemove={removeMaterial} />
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">作業說明</label>
        <textarea value={data.description} onChange={e => set('description', e.target.value)}
          placeholder="描述本次農事作業的內容..."
          rows={3}
          className="input resize-none" />
      </div>

      {/* Notes */}
      <div>
        <label className="label">備註</label>
        <textarea value={data.notes} onChange={e => set('notes', e.target.value)}
          placeholder="補充說明、觀察記錄..."
          rows={2}
          className="input resize-none" />
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 border-2 border-gray-300 text-gray-600 rounded-xl py-3.5 font-semibold">
            取消
          </button>
        )}
        <button type="submit" disabled={loading}
          className="flex-1 bg-green-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50">
          {loading ? '儲存中...' : initial ? '更新記錄' : '儲存記錄'}
        </button>
      </div>
    </form>
  )
}

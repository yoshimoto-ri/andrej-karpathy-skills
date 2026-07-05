import CrudPage from '../../components/CrudPage'

export default function CropTypesPage() {
  return (
    <CrudPage
      table="crop_types" title="作物設定"
      columns={[
        { key: 'code', label: '代碼' },
        { key: 'crop_name', label: '作物名稱' },
        { key: 'growth_days', label: '生長天數', render: r => r.growth_days ? `${r.growth_days} 天` : '—' },
        { key: 'expected_yield_kg', label: '預估產量', render: r => r.expected_yield_kg ? `${r.expected_yield_kg} kg/m²` : '—' },
        { key: 'nitrate_limit_ppm', label: '硝酸鹽容許值', render: r => r.nitrate_limit_ppm ? `${r.nitrate_limit_ppm} ppm` : '—' },
        { key: 'is_active', label: '狀態', render: r => r.is_active ? '✅' : '⛔' },
      ]}
      fields={[
        { name: 'code', label: '作物代碼（1 個大寫英文字母）', required: true, maxLength: 1,
          placeholder: '例：P', hint: '用於產品批號，如 20260601P01。每種作物代碼不可重複。' },
        { name: 'crop_name', label: '作物名稱', required: true, placeholder: '例：南瓜' },
        { name: 'growth_days', label: '標準生長天數', type: 'number',
          hint: '定植後系統將自動推算預估採收日' },
        { name: 'expected_yield_kg', label: '預估單位產量（kg / 平方公尺）', type: 'number' },
        { name: 'nitrate_limit_ppm', label: '硝酸鹽安全容許值（ppm）', type: 'number',
          hint: '對應主婦聯盟規範' },
        { name: 'notes', label: '備註', type: 'textarea' },
        { name: 'is_active', label: '使用中', type: 'checkbox' },
      ]}
      transformPayload={p => ({ ...p, code: (p.code || '').toUpperCase() })}
      orderBy="code" ascending
    />
  )
}

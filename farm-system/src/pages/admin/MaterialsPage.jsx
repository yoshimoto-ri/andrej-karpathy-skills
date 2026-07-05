import CrudPage from '../../components/CrudPage'

const CATEGORY = {
  fertilizer: '肥料', pesticide: '生物農藥', seed: '種子/種苗',
  packaging: '包材', label: '標章', other: '其他',
}

export default function MaterialsPage() {
  return (
    <CrudPage
      table="materials" title="資材庫"
      columns={[
        { key: 'material_name', label: '名稱' },
        { key: 'category', label: '類別', render: r => CATEGORY[r.category] },
        { key: 'unit', label: '單位' },
        { key: 'unit_price', label: '單價', render: r => r.unit_price ? `$${r.unit_price}` : '—' },
        { key: 'organic_cert_no', label: '有機審查字號' },
        { key: 'safety_harvest_days', label: '安全採收期', render: r => r.safety_harvest_days ? `${r.safety_harvest_days} 天` : '—' },
        { key: 'is_active', label: '狀態', render: r => r.is_active ? '✅ 使用中' : '⛔ 停用' },
      ]}
      fields={[
        { name: 'material_name', label: '資材名稱', required: true },
        { name: 'category', label: '類別', type: 'select', required: true,
          options: Object.entries(CATEGORY).map(([value, label]) => ({ value, label })) },
        { name: 'unit', label: '單位', required: true, placeholder: 'kg / 包 / 瓶 / 張' },
        { name: 'unit_price', label: '單價（元）', type: 'number' },
        { name: 'organic_cert_no', label: '有機審查合格字號 / 友善審查通過品項' },
        { name: 'safety_harvest_days', label: '安全採收天數（農藥類必填）', type: 'number',
          hint: '施用後須間隔的天數，系統將依此自動鎖定採收' },
        { name: 'cert_file_url', label: '證書檔案連結', placeholder: 'https://...' },
        { name: 'notes', label: '備註', type: 'textarea' },
        { name: 'is_active', label: '使用中', type: 'checkbox' },
      ]}
      orderBy="material_name" ascending
    />
  )
}

import CrudPage from '../../components/CrudPage'

export default function FieldsPage() {
  return (
    <CrudPage
      table="fields" title="田區管理"
      columns={[
        { key: 'name', label: '田區名稱' },
        { key: 'area_sqm', label: '面積', render: r => `${r.area_sqm} m²` },
        { key: 'field_type', label: '類型', render: r => r.field_type === 'greenhouse' ? '溫室' : '露天' },
        { key: 'location', label: '位置' },
        { key: 'is_active', label: '狀態', render: r => r.is_active ? '✅ 使用中' : '⛔ 停用' },
      ]}
      fields={[
        { name: 'name', label: '田區/溫室編號', required: true, placeholder: '例：A01、溫室1' },
        { name: 'area_sqm', label: '面積（平方公尺）', type: 'number', required: true },
        { name: 'field_type', label: '類型', type: 'select', required: true,
          options: [{ value: 'outdoor', label: '露天' }, { value: 'greenhouse', label: '溫室' }] },
        { name: 'location', label: '位置（地段地號或描述）' },
        { name: 'notes', label: '備註', type: 'textarea' },
        { name: 'is_active', label: '使用中', type: 'checkbox' },
      ]}
      orderBy="name" ascending
    />
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import CrudPage from '../../components/CrudPage'
import { useAuth } from '../../contexts/AuthContext'

const STATUS = { active: '進行中', completed: '已完成', cancelled: '已取消' }

export default function ContractsPage() {
  const { user } = useAuth()
  const [cropTypes, setCropTypes] = useState([])

  useEffect(() => {
    supabase.from('crop_types').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCropTypes(data || []))
  }, [])

  return (
    <CrudPage
      table="contracts" title="契作合約"
      select="*, crop_types(name)"
      orderBy="contract_date"
      columns={[
        { key: 'company_name', label: '契作廠商' },
        { key: 'contract_no', label: '合約編號' },
        { key: 'crop', label: '作物', render: r => r.crop_types?.name },
        { key: 'contracted_qty_kg', label: '契作量', render: r => r.contracted_qty_kg ? `${r.contracted_qty_kg} kg` : '—' },
        { key: 'price_per_kg', label: '單價', render: r => r.price_per_kg ? `$${r.price_per_kg}/kg` : '—' },
        { key: 'delivery_deadline', label: '交貨期限' },
        { key: 'status', label: '狀態', render: r => STATUS[r.status] },
      ]}
      fields={[
        { name: 'company_name', label: '契作廠商名稱', required: true },
        { name: 'contract_no', label: '合約編號' },
        { name: 'contract_date', label: '簽約日期', type: 'date' },
        { name: 'crop_type_id', label: '契作作物', type: 'select',
          options: cropTypes.map(c => ({ value: c.id, label: c.name })) },
        { name: 'contracted_qty_kg', label: '契作數量（kg）', type: 'number' },
        { name: 'grade_requirement', label: '規格/分級要求' },
        { name: 'price_per_kg', label: '契作單價（元/kg）', type: 'number' },
        { name: 'delivery_deadline', label: '交貨期限', type: 'date' },
        { name: 'payment_terms', label: '付款條件' },
        { name: 'contract_file_url', label: '合約掃描檔連結', placeholder: 'https://...' },
        { name: 'status', label: '合約狀態', type: 'select', required: true,
          options: Object.entries(STATUS).map(([value, label]) => ({ value, label })) },
        { name: 'notes', label: '備註', type: 'textarea' },
      ]}
      transformPayload={(p, row) => row ? p : { ...p, created_by: user.id }}
    />
  )
}

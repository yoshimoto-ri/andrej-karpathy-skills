import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import CrudPage from '../../components/CrudPage'
import { useAuth } from '../../contexts/AuthContext'

export default function PurchasesPage() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])

  useEffect(() => {
    supabase.from('materials').select('id, material_name, unit').eq('is_active', true).order('material_name')
      .then(({ data }) => setMaterials(data || []))
  }, [])

  return (
    <CrudPage
      table="material_purchases" title="資材採購"
      select="*, materials(name, unit)"
      orderBy="purchase_date"
      columns={[
        { key: 'purchase_date', label: '採購日期' },
        { key: 'material', label: '資材', render: r => r.materials?.material_name },
        { key: 'quantity', label: '數量', render: r => `${r.quantity} ${r.materials?.unit || ''}` },
        { key: 'unit_price', label: '單價', render: r => r.unit_price ? `$${r.unit_price}` : '—' },
        { key: 'supplier', label: '供應商' },
        { key: 'batch_no', label: '採購批號' },
      ]}
      fields={[
        { name: 'purchase_date', label: '採購日期', type: 'date', required: true },
        { name: 'material_id', label: '資材品項', type: 'select', required: true,
          options: materials.map(m => ({ value: m.id, label: `${m.material_name}（${m.unit}）` })) },
        { name: 'quantity', label: '數量', type: 'number', required: true },
        { name: 'unit_price', label: '單價（元）', type: 'number' },
        { name: 'supplier', label: '供應商' },
        { name: 'batch_no', label: '採購批號', hint: '供溯源追蹤使用' },
        { name: 'notes', label: '備註', type: 'textarea' },
      ]}
      transformPayload={(p, row) => row ? p : { ...p, created_by: user.id }}
    />
  )
}

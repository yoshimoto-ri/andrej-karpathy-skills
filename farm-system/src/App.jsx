import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MaterialsPage from './pages/admin/MaterialsPage'
import PurchasesPage from './pages/admin/PurchasesPage'
import FieldsPage from './pages/admin/FieldsPage'
import CropTypesPage from './pages/admin/CropTypesPage'
import ContractsPage from './pages/admin/ContractsPage'
import UsersPage from './pages/admin/UsersPage'
import PlaceholderPage from './pages/PlaceholderPage'

function RequireRole({ roles, children }) {
  const { profile } = useAuth()
  if (!roles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-gray-400">載入中...</div>
  }

  if (!user) return <LoginPage />

  if (profile && !profile.is_active) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">⛔</div>
        <p className="font-medium text-gray-700">此帳號已停用，請聯繫管理員。</p>
        <button onClick={signOut} className="btn-secondary">登出</button>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />

        {/* Admin */}
        <Route path="admin/materials" element={<RequireRole roles={['admin']}><MaterialsPage /></RequireRole>} />
        <Route path="admin/purchases" element={<RequireRole roles={['admin']}><PurchasesPage /></RequireRole>} />
        <Route path="admin/fields" element={<RequireRole roles={['admin']}><FieldsPage /></RequireRole>} />
        <Route path="admin/crop-types" element={<RequireRole roles={['admin']}><CropTypesPage /></RequireRole>} />
        <Route path="admin/contracts" element={<RequireRole roles={['admin']}><ContractsPage /></RequireRole>} />
        <Route path="admin/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />

        {/* 田間作業（階段二） */}
        <Route path="field/cycles" element={<PlaceholderPage title="栽種週期" />} />
        <Route path="field/env" element={<PlaceholderPage title="每日環境紀錄" />} />
        <Route path="field/activities" element={<PlaceholderPage title="田間作業紀錄" />} />
        <Route path="field/losses" element={<PlaceholderPage title="農損紀錄" />} />

        {/* 產銷（階段三） */}
        <Route path="sales/harvests" element={<PlaceholderPage title="採收紀錄" />} />
        <Route path="sales/processing" element={<PlaceholderPage title="洗選包裝" />} />
        <Route path="sales/shipments" element={<PlaceholderPage title="出貨管理" />} />

        {/* 報表（階段四） */}
        <Route path="reports" element={<PlaceholderPage title="報表中心" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

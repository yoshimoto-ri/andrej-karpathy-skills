import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setInfo('註冊成功！新帳號預設為「田間作業員」，請通知管理員調整您的角色。')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || '發生錯誤，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold text-green-900">農業生產管理系統</h1>
          <p className="text-green-700 text-sm mt-1">有機・友善農業生產履歷</p>
        </div>

        <div className="card p-6">
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  mode === m ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'}`}>
                {m === 'login' ? '登入' : '註冊'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="label">電子信箱</label>
              <input type="email" className="input" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">密碼</label>
              <input type="password" className="input" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="至少 6 個字元" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{info}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

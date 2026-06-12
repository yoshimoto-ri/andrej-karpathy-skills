import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)   // { name, role, is_active }
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return }
    // 確保 profile 存在（trigger 失效時的備援）
    await supabase.from('profiles').upsert(
      { id: u.id, email: u.email },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      await loadProfile(u)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      await loadProfile(u)
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password) => supabase.auth.signUp({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, reloadProfile: () => loadProfile(user) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

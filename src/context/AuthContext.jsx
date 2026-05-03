import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isAdminCredentials, buildAdminUser } from '../utils/adminAuth'

const AUTH_KEY = 'webisafe_auth'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupère la session Supabase existante au chargement (reconnexion auto)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
        return
      }
      // Fallback : ancien auth localStorage (compatibilité)
      const stored = localStorage.getItem(AUTH_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed?.email) {
            setUser(parsed)
            setProfile({ full_name: parsed.name, role: parsed.role || 'user' })
            setLoading(false)
            return
          }
        } catch {
          localStorage.removeItem(AUTH_KEY)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) await fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // ✅ C'est cette fonction que tu passes à AuthModal en tant que onAuth
  async function handleAuth(mode, { name, email, phone, password }) {
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone } // → stocké dans raw_user_meta_data → trigger → profiles
        }
      })
      if (error) return { success: false, error: error.message }
      return { success: true, redirectTo: '/dashboard' }
    }

    if (mode === 'login') {
      // Admin local (pas dans Supabase)
      if (isAdminCredentials(email, password)) {
        const adminUser = buildAdminUser()
        setUser(adminUser)
        setProfile({ full_name: adminUser.name, role: 'admin' })
        localStorage.setItem(AUTH_KEY, JSON.stringify(adminUser))
        return { success: true, redirectTo: '/admin' }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: 'Email ou mot de passe incorrect' }
      return { success: true, redirectTo: '/dashboard' }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, handleAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
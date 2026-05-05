import { createContext, useContext } from 'react'
import { useAuth as useAuthHook } from '../hooks/useAuth'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  // On wrappe le hook localStorage pour que tous les composants
  // qui importent useAuth du contexte fonctionnent avec le même système
  const hook = useAuthHook()

  // Construit un profile compatible avec l'ancienne API
  const profile = hook.user
    ? {
        role: hook.user.role || 'user',
        full_name: hook.user.name || hook.user.email,
      }
    : null

  // Adapte handleAuth pour matcher l'API ancienne du contexte
  async function handleAuth(mode, { name, email, phone, password, phoneCountry }) {
    if (mode === 'signup') {
      const result = hook.signup(name, email, phone, password, phoneCountry)
      if (!result.success) return { success: false, error: result.error }
      return { success: true, redirectTo: '/dashboard' }
    }

    if (mode === 'login') {
      const result = hook.login(email, password)
      if (!result.success) return { success: false, error: result.error }
      if (result.user?.role === 'admin') {
        return { success: true, redirectTo: '/admin' }
      }
      return { success: true, redirectTo: '/dashboard' }
    }
  }

  async function signOut() {
    hook.logout()
  }

  return (
    <AuthContext.Provider value={{
      user: hook.user,
      profile,
      loading: hook.loading,
      handleAuth,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
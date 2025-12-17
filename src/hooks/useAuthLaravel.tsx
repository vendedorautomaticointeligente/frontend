import { useState, useEffect, createContext, useContext } from 'react'

interface User {
  id: string
  email: string
  name: string
  company?: string
  role: 'user' | 'admin'
  plan: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, company?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  accessToken: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Salvar token no localStorage
const saveToken = (token: string) => {
  localStorage.setItem('laravel_auth_token', token)
}

// Recuperar token do localStorage
const getStoredToken = (): string | null => {
  return localStorage.getItem('laravel_auth_token')
}

// Remover token do localStorage
const removeToken = () => {
  localStorage.removeItem('laravel_auth_token')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Verificar sessão ao carregar
  const checkSession = async () => {
    try {
      const storedToken = getStoredToken()
      
      if (!storedToken) {
        setUser(null)
        setAccessToken(null)
        setLoading(false)
        return
      }

      // Fazer requisição para /auth/me para validar token
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          company: data.user.company || '',
          role: data.user.role === 'admin' ? 'admin' : 'user',
          plan: data.user.plan || 'free'
        }
        
        setUser(userData)
        setAccessToken(storedToken)
      } else {
        // Token inválido ou expirado
        removeToken()
        setUser(null)
        setAccessToken(null)
      }
    } catch (error) {
      console.error('Session check error:', error)
      removeToken()
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const signUp = async (email: string, password: string, name: string, company?: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          password_confirmation: password,
          name: name.trim(),
          company: company?.trim() || ''
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Erro ao criar conta'
        }
      }

      // ✅ Cadastro realizado com sucesso
      // ⚠️ NÃO retorna token mais - usuário deve fazer login após cadastro
      // Backend agora retorna apenas confirmação de criação
      
      return { 
        success: true,
        message: 'Usuário criado com sucesso! Por favor, faça login.',
        email: data.email || email,
        redirect_to: '/login'
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão com o servidor' }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Email ou senha inválidos'
        }
      }

      // Salvar token
      if (data.token) {
        saveToken(data.token)
        
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          company: data.user.company || '',
          role: data.user.role === 'admin' ? 'admin' : 'user',
          plan: data.user.plan || 'free'
        }
        
        setUser(userData)
        setAccessToken(data.token)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Erro de conexão com o servidor' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const token = getStoredToken()
      
      if (token) {
        // Fazer logout no servidor (opcional mas bom para limpeza)
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        } catch (error) {
          console.error('Logout error:', error)
        }
      }

      // Limpar dados locais
      removeToken()
      setUser(null)
      setAccessToken(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAdmin: user?.role === 'admin' || false,
    signIn,
    signUp,
    signOut,
    accessToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

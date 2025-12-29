import { useState, useEffect, createContext, useContext } from 'react'
import { isAbortError, safeFetch, FETCH_DEFAULT_TIMEOUT, retryWithBackoff } from '../utils/fetchWithTimeout'
import { getApiUrl } from '../utils/apiConfig'
import { saveToken, removeToken, getToken, hasValidToken } from '../utils/tokenManager'
import { initializeInterceptors, registerLogoutCallback } from '../utils/fetchInterceptor'
import { FETCH_TIMEOUTS, SAFETY_TIMEOUT } from '../utils/fetchDefaults'

interface User {
  id: string
  email: string
  name: string
  company?: string
  phone?: string
  role: 'user' | 'admin'
  plan: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zipcode?: string
  email_notifications?: boolean
  whatsapp_notifications?: boolean
  weekly_report?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, company?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  accessToken: string | null
  loginState: {
    loading: boolean
    error: string | null
    status?: string
  }
}

const API_URL = getApiUrl()

const AuthContext = createContext<AuthContextType | null>(null)

// 🔥 MONITOR DE PERFORMANCE PARA PRODUÇÃO
const SERVER_PERFORMANCE_KEY = 'vai_server_performance'
const PERFORMANCE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutos

interface ServerPerformance {
  avgResponseTime: number
  lastCheck: number
  healthScore: 'good' | 'slow' | 'critical'
}

const getServerPerformance = (): ServerPerformance => {
  try {
    const raw = localStorage.getItem(SERVER_PERFORMANCE_KEY)
    return raw ? JSON.parse(raw) : { avgResponseTime: 2000, lastCheck: 0, healthScore: 'good' }
  } catch {
    return { avgResponseTime: 2000, lastCheck: 0, healthScore: 'good' }
  }
}

const updateServerPerformance = (responseTime: number) => {
  try {
    const current = getServerPerformance()
    const newAvg = (current.avgResponseTime * 0.7) + (responseTime * 0.3) // Média ponderada

    let healthScore: 'good' | 'slow' | 'critical' = 'good'
    if (newAvg > 10000) healthScore = 'critical'
    else if (newAvg > 5000) healthScore = 'slow'

    const performance: ServerPerformance = {
      avgResponseTime: newAvg,
      lastCheck: Date.now(),
      healthScore
    }

    localStorage.setItem(SERVER_PERFORMANCE_KEY, JSON.stringify(performance))
    console.log(`📊 Performance do servidor: ${newAvg.toFixed(0)}ms (${healthScore})`)
  } catch (error) {
    console.warn('⚠️ Erro ao atualizar performance:', error)
  }
}

const getAdaptiveTimeout = (): number => {
  const performance = getServerPerformance()
  const baseTimeout = FETCH_TIMEOUTS.CHECK_SESSION

  // Ajustar timeout baseado na performance histórica
  switch (performance.healthScore) {
    case 'critical': return Math.max(baseTimeout, 45000) // 45s para servidores críticos
    case 'slow': return Math.max(baseTimeout, 25000)     // 25s para servidores lentos
    default: return baseTimeout
  }
}

// 🔥 CACHE EXTENDIDO PARA PRODUÇÃO - mantém sessão por mais tempo em caso de falhas
const EXTENDED_CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 horas em ms
const saveExtendedCache = (user: User, token: string) => {
  try {
    const cacheData = {
      user,
      token,
      timestamp: Date.now(),
      expiresAt: Date.now() + EXTENDED_CACHE_DURATION
    }
    localStorage.setItem('vai_extended_session_cache', JSON.stringify(cacheData))
  } catch (error) {
    console.warn('⚠️ Erro ao salvar cache extendido:', error)
  }
}

const getExtendedCache = (): { user: User; token: string } | null => {
  try {
    const raw = localStorage.getItem('vai_extended_session_cache')
    if (!raw) return null

    const cache = JSON.parse(raw)
    if (Date.now() > cache.expiresAt) {
      localStorage.removeItem('vai_extended_session_cache')
      return null
    }

    return { user: cache.user, token: cache.token }
  } catch (error) {
    console.warn('⚠️ Erro ao ler cache extendido:', error)
    return null
  }
}

// Funções de gestão de token usando o novo sistema robusto
const saveTokenLocal = (token: string) => {
  saveToken(token)
}

const getStoredToken = (): string | null => {
  return getToken()
}

const removeTokenLocal = () => {
  removeToken()
}

const saveUserSnapshot = (user: User) => {
  localStorage.setItem('bia_user', JSON.stringify(user))
}

const getUserSnapshot = (): User | null => {
  const raw = localStorage.getItem('bia_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn('⚠️ Erro ao ler snapshot de usuário:', error)
    return null
  }
}

// 🔥 CRÍTICO: Mapear TODOS os campos do backend para User
// Isso garante que nenhum dado é perdido quando sincronizamos com o servidor
const mapServerUserToLocalUser = (serverUser: any): User => {
  return {
    id: serverUser.id,
    email: serverUser.email,
    name: serverUser.name,
    company: serverUser.company || '',
    phone: serverUser.phone,
    role: serverUser.role === 'admin' ? 'admin' : 'user',
    plan: serverUser.plan || 'free',
    address_street: serverUser.address_street,
    address_number: serverUser.address_number,
    address_complement: serverUser.address_complement,
    address_neighborhood: serverUser.address_neighborhood,
    address_city: serverUser.address_city,
    address_state: serverUser.address_state,
    address_zipcode: serverUser.address_zipcode,
    email_notifications: serverUser.email_notifications,
    whatsapp_notifications: serverUser.whatsapp_notifications,
    weekly_report: serverUser.weekly_report,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loginState, setLoginState] = useState<{ loading: boolean; error: string | null; status?: string }>({
    loading: false,
    error: null,
    status: undefined
  })

  // Verificar sessão ao carregar - SISTEMA ROBUSTO PARA PRODUÇÃO
  const checkSession = async (): Promise<void> => {
    try {
      const storedToken = getStoredToken()
      console.log('📌 checkSession: Token armazenado?', !!storedToken)

      // 🔥 ESTRATÉGIA 1: Se não há token, desbloquear IMEDIATAMENTE
      if (!storedToken) {
        console.log('✅ Nenhum token armazenado, usuário não autenticado')
        setUser(null)
        setAccessToken(null)
        return
      }

      // 🔥 ESTRATÉGIA 2: Tentar cache extendido primeiro (mais tolerante)
      const extendedCache = getExtendedCache()
      if (extendedCache) {
        console.log('📦 Usando cache extendido (robusto):', extendedCache.user.email)
        setUser(extendedCache.user)
        setAccessToken(extendedCache.token)
        setLoading(false)

        // Verificar em background se ainda válido (não bloqueia UI)
        retryWithBackoff(
          async () => {
            const startTime = Date.now()
            const response = await safeFetch(`${API_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${extendedCache.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }, { timeout: getAdaptiveTimeout() })
            const responseTime = Date.now() - startTime
            updateServerPerformance(responseTime)

            if (response?.ok) {
              const data = await response.json()
              console.log('✅ Cache extendido validado em background')
              const userData = mapServerUserToLocalUser(data.user)
              setUser(userData)
              saveUserSnapshot(userData)
              saveExtendedCache(userData, extendedCache.token)
            } else if (response?.status === 401 || response?.status === 403) {
              console.log('❌ Cache extendido inválido, limpando')
              localStorage.removeItem('vai_extended_session_cache')
              removeTokenLocal()
              setUser(null)
              setAccessToken(null)
            }
          },
          2, // 2 retries
          2000, // 2s base delay
          'Background session validation'
        ).catch(bgError => {
          console.warn('⚠️ Validação em background falhou, mantendo cache:', bgError)
          // Não faz nada - deixa usar o cache
        })

        return
      }

      // 🔥 ESTRATÉGIA 3: Cache normal do usuário
      const cachedUser = getUserSnapshot()
      if (cachedUser) {
        console.log('📁 Usando cache normal:', cachedUser.email)
        setUser(cachedUser)
        setAccessToken(storedToken)
        setLoading(false)

        // Verificar em background com retry
        retryWithBackoff(
          async () => {
            const startTime = Date.now()
            const response = await safeFetch(`${API_URL}/auth/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }, { timeout: getAdaptiveTimeout() })
            const responseTime = Date.now() - startTime
            updateServerPerformance(responseTime)

            if (!response) {
              throw new Error('Servidor não respondeu (timeout)')
            }

            if (response.ok) {
              const data = await response.json()
              console.log('✅ Sessão validada em background')
              const userData = mapServerUserToLocalUser(data.user)
              setUser(userData)
              saveUserSnapshot(userData)
              saveExtendedCache(userData, storedToken)
            } else if (response.status === 401 || response.status === 403) {
              console.log('❌ Token inválido, desconectando')
              removeTokenLocal()
              localStorage.removeItem('vai_extended_session_cache')
              setUser(null)
              setAccessToken(null)
            } else {
              throw new Error(`Erro HTTP ${response.status}`)
            }
          },
          3, // 3 retries
          1000, // 1s base delay
          'Background cache validation'
        ).catch(bgError => {
          console.warn('⚠️ Validação em background falhou:', bgError)
          // Salva cache extendido como fallback
          saveExtendedCache(cachedUser, storedToken)
        })

        return
      }

      // 🔥 ESTRATÉGIA 4: Validação completa com retry (último recurso)
      console.log('🔍 Validando sessão completa com token...')
      await retryWithBackoff(
        async () => {
          const startTime = Date.now()
          const response = await safeFetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }, { timeout: getAdaptiveTimeout() })
          const responseTime = Date.now() - startTime
          updateServerPerformance(responseTime)

          if (!response) {
            throw new Error('Servidor não respondeu dentro do timeout')
          }

          console.log('📊 Resposta /auth/me:', response.status)

          if (response.ok) {
            const data = await response.json()
            console.log('✅ Sessão válida:', data.user.email)
            const userData = mapServerUserToLocalUser(data.user)

            setUser(userData)
            setAccessToken(storedToken)
            saveUserSnapshot(userData)
            saveExtendedCache(userData, storedToken)
          } else if (response.status === 401 || response.status === 403) {
            console.log('❌ Token inválido, desconectando')
            removeTokenLocal()
            localStorage.removeItem('vai_extended_session_cache')
            setUser(null)
            setAccessToken(null)
          } else {
            throw new Error(`Erro do servidor: ${response.status}`)
          }
        },
        3, // 3 retries
        2000, // 2s base delay
        'Complete session validation'
      )

    } catch (error) {
      console.error('❌ Erro crítico em checkSession:', error)

      // 🔥 FALLBACK ROBUSTO: Mesmo em erro total, tentar usar cache disponível
      const cachedUser = getUserSnapshot()
      const storedToken = getStoredToken()
      const extendedCache = getExtendedCache()

      if (extendedCache) {
        console.log('🛡️ Usando cache extendido como fallback')
        setUser(extendedCache.user)
        setAccessToken(extendedCache.token)
      } else if (cachedUser && storedToken) {
        console.log('🛡️ Usando cache normal como fallback')
        setUser(cachedUser)
        setAccessToken(storedToken)
        saveExtendedCache(cachedUser, storedToken)
      } else {
        console.log('❌ Nenhum cache disponível, desconectando')
        removeTokenLocal()
        localStorage.removeItem('vai_extended_session_cache')
        setUser(null)
        setAccessToken(null)
      }
    } finally {
      console.log('✔️ checkSession finalizado, liberando UI')
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔐 AuthProvider: iniciando checkSession...')
    console.log('📍 Tokens no localStorage:', Object.keys(localStorage))

    // Inicializar interceptadores globais de forma segura
    try {
      initializeInterceptors()

      // Registrar callback para logout automático quando token expira
      registerLogoutCallback(() => {
        console.warn('🔐 Logout automático acionado (token expirado)')
        setUser(null)
        setAccessToken(null)
      })
    } catch (error) {
      console.error('⚠️ Erro ao inicializar interceptadores:', error)
      // ⚠️ Continuar mesmo com erro - não bloqueia o fluxo
    }

    let isMounted = true

    // 🔥 SEGURANÇA CRÍTICA: Usar timeout configurado (2 segundos)
    // Se algo travar, desbloqueia rápido
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Safety timeout de', SAFETY_TIMEOUT, 'ms acionado - forçando saída do loading')
        setUser(null)
        setAccessToken(null)
        setLoading(false)
      }
    }, SAFETY_TIMEOUT)

    // Executar checkSession com garantia de desbloqueio
    checkSession().finally(() => {
      if (isMounted) {
        clearTimeout(safetyTimeout)
        // 🔥 CRÍTICO: SEMPRE definir loading como false ao final
        setLoading(false)

        // 🔥 HEALTH CHECK PERIÓDICO: Monitorar performance do servidor
        const healthCheckInterval = setInterval(async () => {
          if (!isMounted) return

          try {
            const performance = getServerPerformance()
            // Só fazer health check se não foi feito recentemente
            if (Date.now() - performance.lastCheck > PERFORMANCE_CHECK_INTERVAL) {
              console.log('🏥 Executando health check do servidor...')

              const startTime = Date.now()
              const response = await safeFetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${getStoredToken() || 'invalid'}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }, { timeout: 10000 }) // 10s para health check
              const responseTime = Date.now() - startTime

              updateServerPerformance(responseTime)
              console.log(`🏥 Health check: ${responseTime}ms (${response ? 'OK' : 'FAIL'})`)
            }
          } catch (error) {
            console.warn('🏥 Health check falhou:', error)
            // Mesmo em falha, atualizar performance com tempo alto
            updateServerPerformance(15000) // 15s como falha
          }
        }, PERFORMANCE_CHECK_INTERVAL)

        // Cleanup do health check
        return () => {
          clearInterval(healthCheckInterval)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
    }
  }, [])

  const signUp = async (email: string, password: string, name: string, company?: string) => {
    try {
      setLoginState({ loading: true, error: null, status: 'Criando conta...' })
      
      // 🔥 Usar safeFetch com timeout para signup
      const response = await safeFetch(`${API_URL}/auth/signup`, {
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
      }, { timeout: FETCH_TIMEOUTS.AUTH_SIGNUP })

      if (!response) {
        return {
          success: false,
          error: 'Servidor indisponível. Verifique sua conexão.'
        }
      }

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
      setLoginState({ loading: false, error: null, status: undefined })
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 signIn iniciado para:', email)
      setLoginState({ loading: true, error: null, status: 'Conectando ao servidor...' })
      
      console.log('📡 Fazendo POST para:', `${API_URL}/auth/login`)
      
      // 🔥 LOGIN IMEDIATO: Timeout curto (5s) e resposta rápida
      console.log('⏱️ Enviando login com timeout de', FETCH_TIMEOUTS.AUTH_LOGIN, 'ms...')
      const response = await safeFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      }, { timeout: FETCH_TIMEOUTS.AUTH_LOGIN })

      if (!response) {
        console.error('⏱️ Login timeout - servidor indisponível!')
        setLoginState({
          loading: false,
          error: 'Servidor indisponível. Verifique sua conexão e tente novamente.',
          status: undefined
        })
        return { success: false, error: 'Timeout: servidor não respondeu.' }
      }

      let data = await response.json().catch(() => null)
      console.log('📊 Resposta /auth/login:', response.status, data)

      if (!response.ok) {
        console.log('❌ Erro no login:', data?.message)
        const errorMessage = data?.message || 'Email ou senha inválidos'
        setLoginState({ loading: false, error: errorMessage, status: undefined })
        return {
          success: false,
          error: errorMessage
        }
      }

      // Salvar token
      console.log('💾 Token recebido?', !!data.token)
      if (data?.token) {
        console.log('💾 Salvando token no localStorage...', data.token.substring(0, 20) + '...')
        saveTokenLocal(data.token)
        console.log('✅ Token salvo! localStorage:', getStoredToken()?.substring(0, 20) + '...')
        
        const userData = mapServerUserToLocalUser(data.user)
        
        console.log('👤 Setando user:', userData.email)
        setUser(userData)
        setAccessToken(data.token)
        saveUserSnapshot(userData)
        
        // ✅ LOGIN IMEDIATO: Limpeza do estado rapidamente
        setLoginState({ loading: false, error: null, status: undefined })
        return { success: true }
      } else {
        console.warn('⚠️ Nenhum token recebido na resposta!')
      }

      setLoginState({ loading: false, error: null, status: undefined })
      return { success: false, error: 'Nenhum token recebido' }
    } catch (error) {
      if (isAbortError(error)) {
        console.error('⏱️ Login abortado por timeout')
        setLoginState({
          loading: false,
          error: 'Servidor demorou. Verifique sua conexão e tente novamente.',
          status: undefined
        })
        return { success: false, error: 'Timeout. Verifique sua conexão.' }
      }
      console.error('❌ Erro no catch de signIn:', error instanceof Error ? error.message : error)
      setLoginState({
        loading: false,
        error: error instanceof Error ? error.message : 'Erro de conexão com o servidor',
        status: undefined
      })
      return { success: false, error: error instanceof Error ? error.message : 'Erro de conexão com o servidor' }
    } finally {
      console.log('🔑 signIn finalizado')
    }
  }

  const signOut = async () => {
    try {
      const token = getStoredToken()
      
      // 🔥 LOGOUT IMEDIATO: Limpar localmente primeiro
      removeTokenLocal()
      setUser(null)
      setAccessToken(null)
      setLoginState({ loading: false, error: null, status: undefined })
      
      // 🔥 Notificar servidor em background (sem aguardar)
      if (token) {
        // Fire and forget - não aguardar resposta
        fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }).catch(error => {
          console.error('Logout cleanup error (background):', error)
        })
      }
    } catch (error) {
      console.error('Sign out error:', error)
      // Mesmo com erro, força logout local
      removeTokenLocal()
      setUser(null)
      setAccessToken(null)
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        ...userData
      }
      setUser(updatedUser)
      
      // Atualizar cache local
      saveUserSnapshot(updatedUser)
      
      // Atualizar cache extendido
      if (accessToken) {
        saveExtendedCache(updatedUser, accessToken)
        
        // Verificar se o cache foi salvo corretamente
        const savedCache = localStorage.getItem('vai_extended_session_cache')
        console.log('💾 Cache extendido salvo:', savedCache ? '✅' : '❌')
        if (savedCache) {
          try {
            const parsed = JSON.parse(savedCache)
            console.log('📦 Dados no cache:', {
              user_name: parsed.user?.name,
              user_phone: parsed.user?.phone,
              user_address_street: parsed.user?.address_street,
              user_address_city: parsed.user?.address_city,
            })
          } catch (e) {
            console.error('❌ Erro ao parsear cache:', e)
          }
        }
      }
      
      console.log('✅ Usuário atualizado no contexto e cache:', updatedUser)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAdmin: user?.role === 'admin' || false,
    signIn,
    signUp,
    signOut,
    updateUser,
    accessToken,
    loginState
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

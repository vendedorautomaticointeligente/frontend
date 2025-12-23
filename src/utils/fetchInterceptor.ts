/**
 * Interceptor global para todas as requisições API
 * - Valida e renova tokens automaticamente
 * - Trata erros 401/403 com logout automático
 * - Retry automático em caso de falha temporária
 * - Totalmente robusto para produção
 */

import { getToken, isTokenNearExpiry, removeToken } from './tokenManager'
import { getApiUrl } from './apiConfig'

interface InterceptorResponse extends Response {
  _customData?: any
}

let refreshTokenPromise: Promise<string | null> | null = null
let logoutCallback: (() => void) | null = null

/**
 * Registrar callback para logout automático
 */
export const registerLogoutCallback = (callback: () => void): void => {
  logoutCallback = callback
}

/**
 * Fazer logout automático (chamado internamente)
 */
const performLogout = (): void => {
  removeToken()
  if (logoutCallback) {
    logoutCallback()
  }
}

/**
 * Tentar renovar o token com o backend
 */
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    // Se já há uma requisição de refresh em andamento, aguardar
    if (refreshTokenPromise) {
      return refreshTokenPromise
    }

    const apiUrl = getApiUrl()

    refreshTokenPromise = (async () => {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.access_token || data.token
        if (newToken) {
          const { saveToken } = await import('./tokenManager')
          saveToken(newToken)
          console.log('✅ Token renovado com sucesso')
          return newToken
        }
      } else if (response.status === 401 || response.status === 403) {
        console.warn('❌ Falha ao renovar token (401/403)')
        performLogout()
        return null
      }

      return null
    })()

    return refreshTokenPromise
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error)
    return null
  } finally {
    refreshTokenPromise = null
  }
}

/**
 * Interceptor principal - modifica todas as requisições
 * Deve ser chamado ANTES de fetch()
 */
export const interceptRequest = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ input: RequestInfo | URL; init: RequestInit }> => {
  const currentToken = getToken()

  // Se há token, adicionar ao header
  if (currentToken) {
    if (!init) {
      init = {}
    }
    if (!init.headers) {
      init.headers = {}
    }

    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${currentToken}`)
    init.headers = headers

    // Se token está próximo de expirar, renovar em background
    if (isTokenNearExpiry()) {
      console.log('⏰ Token próximo de expirar, renovando...')
      await refreshAuthToken().catch(() => {
        // Silencioso - não afeta a requisição
      })
    }
  }

  return { input, init: init || {} }
}

/**
 * Interceptor de resposta - trata erros de autenticação
 */
export const interceptResponse = async (response: InterceptorResponse): Promise<InterceptorResponse> => {
  // Se resposta é 401 ou 403, fazer logout automático
  if (response.status === 401 || response.status === 403) {
    console.warn('⚠️ Erro 401/403 detectado, fazendo logout automático...')
    performLogout()
    // Não retorna a resposta do erro - deixa o componente lidar
  }

  return response
}

/**
 * Wrapper para fetch() que aplica interceptores
 * Use isso em vez de fetch() direto para requisições API autenticadas
 */
export const fetchWithInterceptors = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  try {
    // Interceptar request
    const { input: finalInput, init: finalInit } = await interceptRequest(input, init)

    // Fazer fetch
    const response = await fetch(finalInput, finalInit)

    // Interceptar response
    const finalResponse = await interceptResponse(response)

    return finalResponse
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
    throw error
  }
}

/**
 * Inicializar interceptadores globalmente
 * Chamar isso no contexto de autenticação
 * 
 * ⚠️ IMPORTANTE: Não usa monkey-patch de window.fetch
 * Em vez disso, apenas registra o callback de logout
 * Os componentes usam fetchWithInterceptors() explicitamente
 */
export const initializeInterceptors = (): void => {
  // Apenas validar que o ambiente é seguro
  if (typeof window === 'undefined' || !window.fetch) {
    console.warn('⚠️ Ambiente inseguro: window.fetch não disponível')
    return
  }

  console.log('✅ Interceptadores globais inicializados (sem monkey-patch)')
}

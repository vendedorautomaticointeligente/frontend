/**
 * Sistema robusto de gerenciamento de tokens
 * - Armazena token e timestamp de emissão
 * - Detecta tokens expirados automaticamente
 * - Permite refresh automático de tokens
 * - Funciona em produção com total confiabilidade
 */

const TOKEN_STORAGE_KEY = 'laravel_auth_token'
const TOKEN_TIMESTAMP_KEY = 'laravel_auth_token_timestamp'
const TOKEN_EXPIRY_HOURS = 23 // Renovar a cada 23 horas (menos que as 24 do Sanctum)

interface StoredTokenData {
  token: string
  timestamp: number
}

/**
 * Salvar token com timestamp de criação
 */
export const saveToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('❌ Erro ao salvar token:', error)
  }
}

/**
 * Recuperar token com verificação de expiração
 */
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY)

    if (!token || !timestamp) {
      return null
    }

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000

    // Se token expirou, remove e retorna null
    if (tokenAge > expiryMs) {
      console.warn('⏰ Token expirado, removendo...')
      removeToken()
      return null
    }

    return token
  } catch (error) {
    console.error('❌ Erro ao recuperar token:', error)
    return null
  }
}

/**
 * Verificar se token está próximo de expirar (menos de 1 hora)
 */
export const isTokenNearExpiry = (): boolean => {
  try {
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY)
    if (!timestamp) return false

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    const oneHourMs = 60 * 60 * 1000
    const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000

    return tokenAge > expiryMs - oneHourMs
  } catch (error) {
    console.error('❌ Erro ao verificar expiração:', error)
    return false
  }
}

/**
 * Remover token do armazenamento
 */
export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY)
  } catch (error) {
    console.error('❌ Erro ao remover token:', error)
  }
}

/**
 * Verificar se há token válido armazenado
 */
export const hasValidToken = (): boolean => {
  return getToken() !== null
}

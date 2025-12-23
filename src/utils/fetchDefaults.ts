/**
 * Configurações padrão para requisições HTTP em todo o sistema
 * Centralizadas para fácil gerenciamento
 */

export const FETCH_TIMEOUTS = {
  // Checagem de sessão - tolerante a lentidão do servidor
  CHECK_SESSION: 30000,     // 30 segundos - robusto para produção
  
  // Login/Signup - pode ser um pouco mais lento
  AUTH_LOGIN: 5000,         // 5 segundos
  AUTH_SIGNUP: 10000,       // 10 segundos
  
  // Operações gerais da API
  API_DEFAULT: 15000,       // 15 segundos
  
  // Operações longas (upload, geração de relatórios, etc)
  API_LONG: 60000,          // 60 segundos
  
  // Polling SSE e webhooks
  POLL: 10000,              // 10 segundos - polling não precisa ser instantâneo
  STREAMING: 30000          // 30 segundos
} as const

export const SAFETY_TIMEOUT = 2000  // 2 segundos - nunca deixar preso em loading

export const isTimeoutError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('Timeout')
  }
  return false
}

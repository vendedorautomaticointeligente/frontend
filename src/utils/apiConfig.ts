/**
 * Utilitário centralizado para resolver a URL da API
 * Garante que todos os componentes usem a mesma estratégia de resolução
 */

export const getApiUrl = (): string => {
  // 1. Se tem variável de ambiente, usar
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '')
  }

  // 2. Se está no localhost/dev, tentar localhost:8000
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:8000/api'
  }

  // 3. Fallback para a API de produção
  // Este é o padrão quando rodando em produção
  const fallbackHost = 'https://api.vendedorautomaticointeligente.com'
  if (fallbackHost) {
    return `${fallbackHost.replace(/\/+$/, '')}/api`
  }

  // 4. Último recurso: usar window.location.origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/+$/, '')}/api`
  }

  return 'http://localhost:8000/api'
}

/**
 * Versão para contextos onde window pode não estar disponível (SSR)
 */
export const getApiUrlSSR = (defaultUrl = 'https://api.vendedorautomaticointeligente.com/api'): string => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '')
  }
  return defaultUrl.replace(/\/+$/, '')
}

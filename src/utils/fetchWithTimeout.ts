const DEFAULT_TIMEOUT = 120000 // 120 segundos - aumentado para operações mais lentas (Evolution API, geração de QR code, envio de mensagens)

export interface FetchTimeoutOptions {
  timeout?: number
}

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, options?: FetchTimeoutOptions) {
  const controller = new AbortController()
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const shouldApplyTimeout = typeof timeout === 'number' && Number.isFinite(timeout) && timeout > 0
  const id = shouldApplyTimeout ? setTimeout(() => controller.abort(), timeout) : null

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    if (id) {
      clearTimeout(id)
    }
  }
}
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit, options?: FetchTimeoutOptions) {
  try {
    return await fetchWithTimeout(input, init, options)
  } catch (error) {
    if (isAbortError(error)) {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '[request]')
      console.warn(`[safeFetch] Timeout reached for ${url}`)
      return null
    }
    throw error
  }
}

let fetchTimeoutPatched = false

export const isAbortError = (error: unknown): boolean => {
  if (!error) return false
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return (error as { name?: string }).name === 'AbortError'
}

export function setupGlobalFetchTimeout(timeout = DEFAULT_TIMEOUT) {
  if (fetchTimeoutPatched) return

  const globalScope: any = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
        ? self
        : null

  if (!globalScope || typeof globalScope.fetch !== 'function') {
    return
  }

  const originalFetch: typeof fetch = globalScope.fetch.bind(globalScope)

  const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit & { timeout?: number }) => {
    const controller = new AbortController()
    const userSignal = init?.signal
    let abortListener: (() => void) | null = null

    if (userSignal) {
      if (userSignal.aborted) {
        controller.abort()
      } else {
        abortListener = () => controller.abort()
        userSignal.addEventListener('abort', abortListener, { once: true })
      }
    }

    const timeoutDuration = init?.timeout ?? timeout
    const shouldApplyTimeout = typeof timeoutDuration === 'number' && Number.isFinite(timeoutDuration) && timeoutDuration > 0
    const timeoutId = shouldApplyTimeout ? setTimeout(() => controller.abort(), timeoutDuration) : null

    try {
      return await originalFetch(input as RequestInfo, {
        ...init,
        signal: controller.signal
      })
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (userSignal && abortListener) {
        userSignal.removeEventListener('abort', abortListener)
      }
    }
  }

  globalScope.fetch = patchedFetch as typeof fetch
  fetchTimeoutPatched = true
}

/**
 * Função de retry com backoff exponencial para operações assíncronas
 * - Adequada para produção: robusta, com logs e limites
 * - Não retry para erros não recuperáveis (ex.: 401 Unauthorized)
 * - Backoff exponencial: 1s, 2s, 4s, 8s, etc.
 * - Máximo de 3 tentativas por padrão
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    shouldRetry?: (error: any) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000, // 1 segundo
    maxDelay = 30000, // 30 segundos
    shouldRetry = (error: any) => {
      // Não retry para erros de autenticação ou cliente
      if (error?.status === 401 || error?.status === 403) return false
      // Retry para erros de servidor, timeout ou rede
      if (error?.status >= 500) return true
      if (isAbortError(error)) return true
      if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return true
      return false
    }
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      console.warn(`[retryWithBackoff] Tentativa ${attempt + 1} falhou, retry em ${delay}ms:`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export { DEFAULT_TIMEOUT as FETCH_DEFAULT_TIMEOUT }

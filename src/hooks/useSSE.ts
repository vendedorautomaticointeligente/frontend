import { useEffect, useRef, useCallback } from 'react'
import { getToken } from '../utils/tokenManager'
import { getApiUrl } from '../utils/apiConfig'

interface SSEEvent {
  type: string
  data: any
  timestamp: string
  id: string
}

interface UseSSEOptions {
  onMessage?: (event: SSEEvent) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export const useSSE = (userId: string | null, options: UseSSEOptions = {}) => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 1000, // 🔥 OTIMIZADO: Reconexão em 1s
    maxReconnectAttempts = 5
  } = options

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!userId) return

    const token = getToken()
    if (!token) return

    const baseUrl = getApiUrl()
    const sseUrl = `${baseUrl}/sse/stream?token=${encodeURIComponent(token)}`

    try {
      const eventSource = new EventSource(sseUrl)

      eventSource.onopen = () => {
        console.log('🔗 SSE: Conexão estabelecida com sucesso!', {
          url: sseUrl.substring(0, 50) + '...',
          userId,
          readyState: eventSource.readyState
        })
        reconnectAttemptsRef.current = 0
        onOpen?.()
      }

      // Listen for specific events
      eventSource.addEventListener('connected', (event) => {
        console.log('✅ SSE: Evento "connected" recebido', JSON.parse(event.data))
        onMessage?.({
          type: 'connected',
          data: JSON.parse(event.data),
          timestamp: new Date().toISOString(),
          id: `connected-${Date.now()}`
        })
      })

      eventSource.addEventListener('message_received', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 SSE: Evento "message_received" RECEBIDO!', {
            messageId: data.message_id,
            conversationId: data.conversation_id,
            text: data.text?.substring(0, 50),
            timestamp: new Date().toISOString()
          })

          onMessage?.({
            type: 'message_received',
            data,
            timestamp: new Date().toISOString(),
            id: `msg-${Date.now()}`
          })
        } catch (error) {
          console.error('❌ SSE: Erro ao processar message_received', error)
        }
      })

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('💓 SSE: Heartbeat recebido', {
            timestamp: data.timestamp,
            uptime: data.uptime,
            strategy: data.strategy
          })
          onMessage?.({
            type: 'heartbeat',
            data,
            timestamp: new Date().toISOString(),
            id: `heartbeat-${Date.now()}`
          })
        } catch (error) {
          console.error('❌ SSE: Erro ao processar heartbeat', error)
        }
      })

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 SSE: Generic message event', data)

          onMessage?.({
            type: data.type || 'unknown',
            data,
            timestamp: new Date().toISOString(),
            id: `generic-${Date.now()}`
          })
        } catch (error) {
          console.error('❌ SSE: Error parsing generic event data', error)
        }
      }
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ SSE: Erro na conexão!', {
          readyState: eventSource.readyState,
          url: sseUrl.substring(0, 50) + '...',
          error: error,
          attempt: reconnectAttemptsRef.current + 1
        })
        onError?.(error)

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`🔄 SSE: Tentando reconectar em ${reconnectInterval}ms (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else {
          console.error('❌ SSE: Máximo de tentativas de reconexão atingido')
          onClose?.()
        }
      }

      eventSourceRef.current = eventSource
    } catch (error) {
      console.error('❌ SSE: Failed to create EventSource', error)
    }
  }, [userId, onMessage, onError, onOpen, onClose, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('🔌 SSE: Disconnecting')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    onClose?.()
  }, [onClose])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Reconnect when userId changes
  useEffect(() => {
    if (userId) {
      disconnect()
      connect()
    } else {
      disconnect()
    }
  }, [userId, connect, disconnect])

  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  }
}

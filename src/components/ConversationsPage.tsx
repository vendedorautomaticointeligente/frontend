import { useState, useCallback, useRef, useEffect } from "react"
import { Search, Phone, Video, MoreVertical, Send, Loader2, RefreshCw } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { TypingIndicator } from "./TypingIndicator"
import { useAuth } from "../hooks/useAuthLaravel"
import { useSSE } from "../hooks/useSSE"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { getApiUrl } from '../utils/apiConfig'
import { FETCH_TIMEOUTS } from '../utils/fetchDefaults'

// ============================================================================
// TYPES - Simples e Diretos
// ============================================================================

type Message = {
  id: string
  text: string
  timestamp: string
  isSent: boolean
  status?: 'sent' | 'delivered' | 'read'
}

type Conversation = {
  id: string
  phone_number: string
  contact_name: string
  avatar: string
  lastMessage: string
  lastMessageTime: string
  unread_count: number
  whatsapp_instance_name?: string
}

// ============================================================================
// COMPONENTE PRINCIPAL - Simplificado
// ============================================================================

export function ConversationsPage() {
  const { accessToken, user } = useAuth()
  const baseUrl = getApiUrl()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // STATE - Apenas 3 coisas necessárias
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // STATE - Loading/UI
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')

  // 🆕 PASSO 5: Typing indicator para segmentos de resposta
  const [isAgentTyping, setIsAgentTyping] = useState(false)

  // STATE - SSE/Polling fallback
  const [usePolling, setUsePolling] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [sseErrors, setSseErrors] = useState(0)

  // ============================================================================
  // SSE: Conexão ultra-rápida para mensagens em tempo real
  // ============================================================================

  useSSE(user?.id?.toString(), {
    onMessage: (event) => {
      console.log('🎯 SSE: Evento recebido no frontend', event);

      // 🔥 Reset error count on successful message
      setSseErrors(0)
      setUsePolling(false) // Disable polling if SSE is working

      // 🔥 OTIMIZADO: Processamento ultra-rápido sem logs desnecessários
      if (event.type === 'message_received') {
        console.log('📨 SSE: Processando message_received', event.data);

        const data = event.data

        // Se mensagem é para conversa atual, adicionar instantaneamente
        if (selectedConversation?.id === data.conversation_id?.toString()) {
          console.log('✅ SSE: Adicionando mensagem à conversa atual', {
            conversationId: selectedConversation.id,
            messageText: data.text?.substring(0, 50)
          });

          setMessages(prev => [...prev, {
            id: data.message_id?.toString() || `sse-${Date.now()}`,
            text: data.text || '',
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isSent: false,
            status: 'read'
          }])
        } else {
          console.log('🔄 SSE: Mensagem para outra conversa, recarregando lista', {
            messageConversationId: data.conversation_id,
            currentConversationId: selectedConversation?.id
          });

          // Se não é para conversa atual, recarregar lista silenciosamente
          loadConversations(true, false)
        }
      } else if (event.type === 'message_optimistic') {
        // 🔥 OTIMIZADO: Atualização otimista ultra-rápida
        const data = event.data
        if (selectedConversation?.id === data.conversation_id?.toString()) {
          setMessages(prev => [...prev, {
            id: data.message_id?.toString() || `opt-${Date.now()}`,
            text: data.text || '',
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isSent: true,
            status: 'sending'
          }])
        }
      } else if (event.type === 'message_sent') {
        // 🔥 OTIMIZADO: Confirmação de envio ultra-rápida
        const data = event.data
        setMessages(prev =>
          prev.map(m =>
            m.id === data.message_id?.toString()
              ? { ...m, status: 'sent' }
              : m
          )
        )
      } else if (event.type === 'message_failed') {
        // 🔥 OTIMIZADO: Tratamento de erro ultra-rápido
        const data = event.data
        setMessages(prev =>
          prev.map(m =>
            m.id === data.message_id?.toString()
              ? { ...m, status: 'failed' }
              : m
          )
        )
      } 
      // 🆕 PASSO 5: Handlers para typing indicator de segmentos
      else if (event.type === 'response_segment_start') {
        // Começar animação de typing
        if (selectedConversation?.id === event.data?.conversation_id?.toString()) {
          setIsAgentTyping(true)
          console.log('⌨️ SSE: Agente começou a escrever (segment start)')
        }
      }
      else if (event.type === 'response_segment_end') {
        // Parar animação de typing
        if (selectedConversation?.id === event.data?.conversation_id?.toString()) {
          setIsAgentTyping(false)
          console.log('✅ SSE: Agente finalizou segmento (segment end)')
        }
      }
    },
    onError: (error) => {
      // 🔥 Count SSE errors and enable polling fallback after 3 consecutive errors
      setSseErrors(prev => {
        const newCount = prev + 1
        if (newCount >= 3 && !usePolling) {
          console.log('🔄 SSE falhou 3 vezes - ativando polling como fallback')
          setUsePolling(true)
        }
        return newCount
      })
    },
    onOpen: () => {
      // 🔥 Reset error count on successful connection
      setSseErrors(0)
      setUsePolling(false)
    },
    onClose: () => {
      // 🔥 SSE closed - will try to reconnect automatically
    }
  })

  // ============================================================================
  // POLLING FALLBACK: Ativado quando SSE falha persistentemente
  // ============================================================================

  const pollForMessages = useCallback(async () => {
    if (!accessToken || !user?.id) return

    console.log('🔄 Polling: Iniciando busca por mensagens...')

    try {
      const response = await safeFetch(`${baseUrl}/sse/poll?token=${encodeURIComponent(accessToken)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }, { timeout: FETCH_TIMEOUTS.POLL })

      if (response && response.ok) {
        const data = await response.json()

        console.log('📊 Polling: Resposta recebida', {
          eventos: data.events?.length || 0,
          hasEvents: data.has_events
        })

        // Processar eventos recebidos via polling
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((event: any) => {
            console.log('🔄 Polling: Processando evento', event)

            if (event.type === 'message_received') {
              const eventData = event.data

              // Se mensagem é para conversa atual, adicionar
              if (selectedConversation?.id === eventData.conversation_id?.toString()) {
                console.log('✅ Polling: Adicionando mensagem à conversa atual')

                setMessages(prev => [...prev, {
                  id: eventData.message_id?.toString() || `poll-${Date.now()}`,
                  text: eventData.text || '',
                  timestamp: new Date().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  isSent: false,
                  status: 'read'
                }])
              } else {
                console.log('🔄 Polling: Mensagem para outra conversa, recarregando lista')

                // Se não é para conversa atual, recarregar lista
                loadConversations(true, false)
              }
            }
          })
        }
      } else {
        console.error('❌ Polling: Falha na requisição', response?.status)
      }
    } catch (error) {
      console.error('❌ Polling: Erro na requisição', error)
    }
  }, [accessToken, user?.id, baseUrl, selectedConversation?.id, loadConversations])

  // EFEITO: Polling fallback quando SSE falha
  useEffect(() => {
    if (usePolling && accessToken) {
      console.log('🔄 Iniciando polling fallback a cada 5 segundos')

      // Poll imediato
      pollForMessages()

      // Configurar polling a cada 5 segundos
      const interval = setInterval(pollForMessages, 5000)
      setPollingInterval(interval)

      return () => {
        clearInterval(interval)
        setPollingInterval(null)
      }
    } else {
      // Desabilitar polling se SSE estiver funcionando
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
        console.log('✅ Polling desabilitado - SSE funcionando')
      }
    }
  }, [usePolling, accessToken, pollForMessages, pollingInterval])

  // ============================================================================
  // FUNÇÃO 1: Carregar Conversas (uma vez no mount)
  // ============================================================================

  const loadConversations = useCallback(async (silent = false, autoSelect = true) => {
    console.log('🔐 AccessToken:', accessToken)
    console.log('👤 User:', user)
    if (!accessToken) {
      console.error('❌ Sem accessToken!')
      return
    }

    try {
      if (!silent) setLoading(true)

      console.log('🌐 Fazendo request para:', `${baseUrl}/conversations`)
      const response = await safeFetch(
        `${baseUrl}/conversations`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      console.log('📡 Response status:', response?.status)
      console.log('📡 Response ok:', response?.ok)

      if (!response?.ok) {
        console.error('❌ Response não ok:', response?.status, response?.statusText)
        toast.error('Erro ao carregar conversas')
        return
      }

      const data = await response.json()
      console.log('🔍 Resposta da API de conversas:', data)

      if (data.status === 'success' && data.data?.data) {
        console.log('📋 Dados das conversas:', data.data.data)
        const convs = data.data.data.map((c: any) => {
          console.log('🔄 Processando conversa:', c)
          return {
            id: c.id,
            phone_number: c.phone_number,
            contact_name: c.contact_name || 'Sem nome',
            avatar: '👤',
            lastMessage: c.last_message || 'Sem mensagens',
            lastMessageTime: c.last_message_at || new Date().toISOString(),
            unread_count: c.unread_count || 0,
            whatsapp_instance_name: c.whatsapp_instance_name
          }
        })
        console.log('✅ Conversas processadas:', convs)
        setConversations(convs)
        
        // Se autoSelect está ativo e há conversas, selecionar a primeira
        if (autoSelect && convs.length > 0) {
          setSelectedConversation(convs[0])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      toast.error('Erro ao carregar conversas')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO 2: Carregar Mensagens da Conversa
  // ============================================================================

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accessToken) return

    try {
      setLoadingMessages(true)

      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/messages`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        toast.error('Erro ao carregar mensagens')
        return
      }

      const data = await response.json()

      if (data.status === 'success' && Array.isArray(data.data)) {
        const msgs = data.data.map((m: any) => ({
          id: m.id,
          text: m.text,
          timestamp: new Date(m.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isSent: m.direction === 'sent',
          status: m.direction === 'sent' ? 'read' : undefined
        }))
        setMessages(msgs)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedConversation, accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO 3: Enviar Mensagem (SEM DELAYS, SEM CACHE)
  // ============================================================================

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation || isSending) return

    const messageText = messageInput
    const tempId = `temp-${Date.now()}`

    // 🔥 OTIMIZADO: UI update instantâneo
    setMessages(prev => [...prev, {
      id: tempId,
      text: messageText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isSent: true,
      status: 'sending'
    }])

    setMessageInput('')
    setIsSending(true)

    try {
      // 🔥 OTIMIZADO: Request ultra-rápido sem timeout desnecessário
      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ text: messageText })
        }
      )

      if (!response?.ok) {
        // 🔥 OTIMIZADO: Rollback ultra-rápido
        setMessages(prev => prev.filter(m => m.id !== tempId))
        return
      }

      const data = await response.json()

      if (data.status === 'success') {
        // 🔥 OTIMIZADO: Substituição instantânea
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? { ...m, id: data.data.id, status: 'sending' }
              : m
          )
        )
      } else {
        // 🔥 OTIMIZADO: Cleanup instantâneo
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
    } catch (error) {
      // 🔥 OTIMIZADO: Rollback silencioso
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }, [messageInput, selectedConversation, accessToken, baseUrl, isSending])

  // ============================================================================
  // EFEITO 1: Carregar conversas uma vez no mount
  // ============================================================================

  useEffect(() => {
    if (accessToken) {
      loadConversations(false, true) // silent=false, autoSelect=true
    }
  }, [accessToken, loadConversations]) // Executa quando accessToken ou loadConversations mudam

  // ============================================================================
  // EFEITO 2: Carregar mensagens quando conversa muda
  // ============================================================================

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    }
  }, [selectedConversation, loadMessages])

  // ============================================================================
  // EFEITO 3: Auto-scroll para última mensagem
  // ============================================================================

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ============================================================================
  // RENDER: Lista de Conversas
  // ============================================================================

  const filteredConversations = conversations.filter(c =>
    c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_number.includes(searchQuery)
  )

  if (!accessToken) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Não autenticado</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-6 py-3 shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Conversas</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadConversations(false)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List - ESTREITA */}
        <div className="w-64 bg-white/60 backdrop-blur-sm border-r border-gray-200/60 flex flex-col shadow-lg overflow-hidden flex-shrink-0">
          {/* Search */}
          <div className="p-5 border-b border-gray-200/60 space-y-4 bg-gradient-to-r from-white/90 to-blue-50/50 flex-shrink-0">
            <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Nenhuma conversa</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`
                    p-3 border-b border-gray-200/40 cursor-pointer transition
                    hover:bg-blue-50/50
                    ${selectedConversation?.id === conv.id ? 'bg-blue-100/60 border-l-4 border-l-blue-500' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback>{conv.contact_name[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {conv.contact_name}
                        </p>
                        <p className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(conv.lastMessageTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - GRANDE (flex-1) */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200/60 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{selectedConversation.contact_name[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedConversation.contact_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.phone_number}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Nenhuma mensagem</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-xs px-4 py-2 rounded-lg
                          ${msg.isSent
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                          }
                        `}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.isSent ? 'text-blue-100' : 'text-gray-600'}`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* 🆕 PASSO 5: Typing indicator quando agente está respondendo */}
                  {isAgentTyping && (
                    <div className="flex justify-start">
                      <TypingIndicator isTyping={true} agentName="Agente" />
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200/60 p-4 flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-1 flex items-end gap-2 bg-gray-100 rounded-lg px-3 py-2">
                  <Input
                    type="text"
                    placeholder="Digite uma mensagem..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="border-0 bg-transparent focus:ring-0"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <p className="text-gray-500">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}

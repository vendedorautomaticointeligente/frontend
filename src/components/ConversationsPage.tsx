import { useState, useCallback, useRef, useEffect } from "react"
import { Search, Phone, Video, MoreVertical, Send, Loader2, RefreshCw, UserPlus } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { TypingIndicator } from "./TypingIndicator"
import { MediaMessage } from "./MediaMessage"
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
  message_type?: 'text' | 'audio' | 'image' | 'video' | 'document'
  media_data?: {
    url?: string
    caption?: string
    filename?: string
    transcription?: string
    analysis?: string
    duration?: number
    mimetype?: string
    ptt?: boolean
    animated?: boolean
    analyzed_at?: string
  }
  media_url?: string
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
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // STATE - Apenas 3 coisas necessárias
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // STATE - Filtro por instância (NOVO)
  // 🔥 IMPORTANTE: Por padrão, mostrar TODAS as instâncias
  // Quando usuário reconecta com nova instância, ele pode acessar conversas de instâncias anteriores
  const [selectedInstance, setSelectedInstance] = useState<string>('') // '' = todas as instâncias
  const [availableInstances, setAvailableInstances] = useState<string[]>([])

  // STATE - Loading/UI
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')

  // 🆕 PASSO 5: Typing indicator para segmentos de resposta
  const [isAgentTyping, setIsAgentTyping] = useState(false)

  // 🆕 PASSO 6: Upload de mídia
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [mediaPreview, setMediaPreview] = useState<{
    type: 'audio' | 'image' | null
    file: File | null
    preview: string | null
    caption: string
  }>({ type: null, file: null, preview: null, caption: '' })
  const [uploadError, setUploadError] = useState<string | null>(null)

  // STATE - Dialog para criar lead
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false)
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    segment: '',
    status: 'new' as 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost',
  })

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

      // 🔥 HELPER: Normalizar conversation_id para string para comparação consistente
      const normalizeId = (id: any) => String(id)

      // 🔥 OTIMIZADO: Processamento ultra-rápido sem logs desnecessários
      if (event.type === 'message_received') {
        console.log('📨 SSE: Processando message_received', event.data);

        const data = event.data
        const messageConvId = normalizeId(data.conversation_id)
        const selectedConvId = normalizeId(selectedConversation?.id)

        // Se mensagem é para conversa atual, adicionar instantaneamente
        if (messageConvId === selectedConvId) {
          console.log('✅ SSE: Adicionando mensagem à conversa atual', {
            conversationId: selectedConvId,
            messageText: data.text?.substring(0, 50)
          });

          // ✅ EVITAR DUPLICAÇÃO: Verificar se mensagem já existe
          setMessages(prev => {
            const messageId = normalizeId(data.message_id)
            const alreadyExists = prev.some(m => normalizeId(m.id) === messageId)
            
            if (alreadyExists) {
              console.log('⚠️ SSE: Mensagem duplicada detectada, ignorando', { messageId })
              return prev
            }

            return [...prev, {
              id: messageId || `sse-${Date.now()}`,
              text: data.text || '',
              timestamp: new Date(data.created_at || Date.now()).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              isSent: data.direction === 'sent' || false,
              status: data.direction === 'sent' ? 'sent' : 'read',
              message_type: data.message_type,
              media_data: data.media_data
            }]
          })
        } else {
          console.log('🔄 SSE: Mensagem para outra conversa, recarregando lista', {
            messageConversationId: messageConvId,
            currentConversationId: selectedConvId
          });

          // Se não é para conversa atual, recarregar lista silenciosamente
          loadConversations(true, false)
        }
      } else if (event.type === 'message_optimistic') {
        // 🔥 OTIMIZADO: Atualização otimista ultra-rápida
        const data = event.data
        const messageConvId = normalizeId(data.conversation_id)
        const selectedConvId = normalizeId(selectedConversation?.id)
        
        if (messageConvId === selectedConvId) {
          setMessages(prev => {
            const messageId = normalizeId(data.message_id)
            const alreadyExists = prev.some(m => normalizeId(m.id) === messageId)
            
            if (alreadyExists) {
              return prev
            }

            return [...prev, {
              id: messageId || `opt-${Date.now()}`,
              text: data.text || '',
              timestamp: new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              isSent: true,
              status: 'sending',
              message_type: data.message_type,
              media_data: data.media_data
            }]
          })
        }
      } else if (event.type === 'message_sent') {
        // 🔥 OTIMIZADO: Confirmação de envio ultra-rápida
        const data = event.data
        const messageId = normalizeId(data.message_id)
        
        setMessages(prev =>
          prev.map(m =>
            normalizeId(m.id) === messageId
              ? { ...m, status: 'sent' }
              : m
          )
        )
      } else if (event.type === 'message_failed') {
        // 🔥 OTIMIZADO: Tratamento de erro ultra-rápido
        const data = event.data
        const messageId = normalizeId(data.message_id)
        
        setMessages(prev =>
          prev.map(m =>
            normalizeId(m.id) === messageId
              ? { ...m, status: 'failed' }
              : m
          )
        )
      } 
      // 🆕 PASSO 5: Handlers para typing indicator de segmentos
      else if (event.type === 'response_segment_start') {
        // Começar animação de typing
        const messageConvId = normalizeId(event.data?.conversation_id)
        const selectedConvId = normalizeId(selectedConversation?.id)
        
        if (messageConvId === selectedConvId) {
          setIsAgentTyping(true)
          console.log('⌨️ SSE: Agente começou a escrever (segment start)')
        }
      }
      else if (event.type === 'response_segment_end') {
        // Parar animação de typing
        const messageConvId = normalizeId(event.data?.conversation_id)
        const selectedConvId = normalizeId(selectedConversation?.id)
        
        if (messageConvId === selectedConvId) {
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

        // 🔥 HELPER: Normalizar conversation_id para string para comparação consistente
        const normalizeId = (id: any) => String(id)

        // Processar eventos recebidos via polling
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((event: any) => {
            console.log('🔄 Polling: Processando evento', event)

            if (event.type === 'message_received') {
              const eventData = event.data
              const messageConvId = normalizeId(eventData.conversation_id)
              const selectedConvId = normalizeId(selectedConversation?.id)

              // Se mensagem é para conversa atual, adicionar
              if (messageConvId === selectedConvId) {
                console.log('✅ Polling: Adicionando mensagem à conversa atual')

                setMessages(prev => {
                  const messageId = normalizeId(eventData.message_id)
                  const alreadyExists = prev.some(m => normalizeId(m.id) === messageId)
                  
                  if (alreadyExists) {
                    console.log('⚠️ Polling: Mensagem duplicada detectada, ignorando', { messageId })
                    return prev
                  }

                  return [...prev, {
                    id: messageId || `poll-${Date.now()}`,
                    text: eventData.text || '',
                    timestamp: new Date(eventData.created_at || Date.now()).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                    isSent: eventData.direction === 'sent' || false,
                    status: eventData.direction === 'sent' ? 'sent' : 'read',
                    message_type: eventData.message_type,
                    media_data: eventData.media_data
                  }]
                })
              } else {
                console.log('🔄 Polling: Mensagem para outra conversa, recarregando lista', {
                  messageConversationId: messageConvId,
                  currentConversationId: selectedConvId
                })

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
  // FUNÇÃO 1B: Atualizar instâncias disponíveis (NOVO)
  // ============================================================================

  useEffect(() => {
    if (conversations.length > 0) {
      // Extrair instâncias únicas, filtrando vazias
      const instances = Array.from(
        new Set(
          conversations
            .map(c => c.whatsapp_instance_name)
            .filter(instance => instance && instance.trim() !== '')
        )
      ).sort()

      console.log('📱 Instâncias disponíveis das conversas:', instances)
      setAvailableInstances(instances)

      // Se conversas foram recarregadas, resetar instância selecionada para "Todas"
      setSelectedInstance('')
    }
  }, [conversations])

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
          status: m.direction === 'sent' ? 'read' : undefined,
          message_type: m.message_type,
          media_data: m.media_data
        }))
        console.log('✅ [loadMessages] Mensagens carregadas:', {
          total: msgs.length,
          conversationId: selectedConversation?.id,
          sample: msgs.slice(0, 2)
        })
        setMessages(msgs)
      } else {
        console.error('❌ [loadMessages] Resposta inválida:', {
          status: data.status,
          isArray: Array.isArray(data.data),
          dataKeys: Object.keys(data),
          data
        })
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedConversation, accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO 2.5: Upload de Mídia (🎙️ 📷)
  // ============================================================================

  /**
   * Validar arquivo de mídia
   * - Áudio: MP3, OGG, WAV (máx 10MB)
   * - Imagem: JPG, PNG, GIF, WebP (máx 5MB)
   */
  const validateMediaFile = (file: File, type: 'audio' | 'image'): { valid: boolean; error?: string } => {
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024  // 5MB

    if (type === 'audio') {
      const allowedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm']
      const maxSize = MAX_AUDIO_SIZE

      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Formato de áudio não suportado. Use MP3, OGG, WAV ou WebM.' }
      }

      if (file.size > maxSize) {
        return { valid: false, error: 'Arquivo de áudio muito grande. Máximo 10MB.' }
      }

      return { valid: true }
    }

    if (type === 'image') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const maxSize = MAX_IMAGE_SIZE

      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Formato de imagem não suportado. Use JPG, PNG, GIF ou WebP.' }
      }

      if (file.size > maxSize) {
        return { valid: false, error: 'Arquivo de imagem muito grande. Máximo 5MB.' }
      }

      return { valid: true }
    }

    return { valid: false, error: 'Tipo de mídia desconhecido.' }
  }

  /**
   * Tratar seleção de arquivo (áudio ou imagem)
   */
  const handleMediaFileSelected = async (file: File, type: 'audio' | 'image') => {
    setUploadError(null)

    // 1️⃣ Validar arquivo
    const validation = validateMediaFile(file, type)
    if (!validation.valid) {
      setUploadError(validation.error)
      return
    }

    // 2️⃣ Criar preview
    let preview: string | null = null
    try {
      if (type === 'image') {
        // Preview de imagem
        preview = URL.createObjectURL(file)
      } else if (type === 'audio') {
        // Para áudio, apenas gerar URL para reproduzir
        preview = URL.createObjectURL(file)
      }
    } catch (error) {
      console.error('Erro ao criar preview:', error)
    }

    // 3️⃣ Armazenar no state
    setMediaPreview({
      type,
      file,
      preview,
      caption: ''
    })
  }

  /**
   * Enviar arquivo de mídia para backend
   */
  const handleSendMedia = useCallback(async () => {
    if (!selectedConversation || !mediaPreview.file || isUploadingMedia) return

    setIsUploadingMedia(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', mediaPreview.file)
    formData.append('caption', mediaPreview.caption)
    formData.append('type', mediaPreview.type || 'image')

    try {
      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/send-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      )

      if (!response?.ok) {
        setUploadError('Erro ao enviar mídia. Tente novamente.')
        return
      }

      const data = await response.json()

      if (data.status === 'success') {
        // Limpar preview
        if (mediaPreview.preview) {
          URL.revokeObjectURL(mediaPreview.preview)
        }
        setMediaPreview({ type: null, file: null, preview: null, caption: '' })
        toast.success('Mídia enviada com sucesso!')
      } else {
        setUploadError(data.message || 'Erro ao enviar mídia.')
      }
    } catch (error) {
      console.error('Erro ao enviar mídia:', error)
      setUploadError('Erro ao conectar ao servidor.')
    } finally {
      setIsUploadingMedia(false)
    }
  }, [selectedConversation, mediaPreview, accessToken, baseUrl, isUploadingMedia])

  /**
   * Cancelar upload e limpar preview
   */
  const handleCancelMediaUpload = () => {
    if (mediaPreview.preview) {
      URL.revokeObjectURL(mediaPreview.preview)
    }
    setMediaPreview({ type: null, file: null, preview: null, caption: '' })
    setUploadError(null)
  }

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
  // FUNÇÃO 4: Criar Lead a partir da Conversa
  // ============================================================================

  const handleCreateLead = useCallback(async () => {
    if (!selectedConversation || !accessToken) return

    setIsCreatingLead(true)

    try {
      // Preparar dados do lead
      const leadData = {
        name: leadFormData.name || selectedConversation.contact_name,
        company: leadFormData.company || '',
        email: leadFormData.email || '',
        phone: leadFormData.phone || selectedConversation.phone_number,
        city: leadFormData.city || '',
        state: leadFormData.state || '',
        segment: leadFormData.segment || '',
        status: leadFormData.status || 'new',
        source: 'conversation'
      }

      // Chamar API para criar/atualizar lead
      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/create-or-update-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(leadData)
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        const errorData = await response?.json().catch(() => ({}))
        toast.error(errorData?.message || 'Erro ao criar lead')
        return
      }

      const result = await response.json()

      if (result.status === 'success') {
        toast.success('Lead criado/atualizado com sucesso!')
        setShowCreateLeadDialog(false)
        
        // Resetar formulário
        setLeadFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          city: '',
          state: '',
          segment: '',
          status: 'new',
        })

        // Recarregar conversas para atualizar dados do lead
        loadConversations(true, false)
      } else {
        toast.error(result.message || 'Erro ao criar lead')
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      toast.error('Erro ao criar lead')
    } finally {
      setIsCreatingLead(false)
    }
  }, [selectedConversation, accessToken, baseUrl, leadFormData, loadConversations])

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
      console.log('✅ Conversa selecionada - botões de mídia devem estar visíveis:', {
        conversationId: selectedConversation.id,
        mediaPreviewType: mediaPreview.type,
        isUploadingMedia: isUploadingMedia,
        audioInputRefExists: !!audioInputRef.current,
        imageInputRefExists: !!imageInputRef.current
      })
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

  const filteredConversations = conversations.filter(c => {
    // Filtro de busca
    const matchesSearch = c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_number.includes(searchQuery)

    // Filtro de instância (NOVO)
    const matchesInstance = selectedInstance === '' || c.whatsapp_instance_name === selectedInstance

    return matchesSearch && matchesInstance
  })

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
          {/* Instance Dropdown Filter - NOVO */}
          {/* 🔥 Mostrar filtro de instâncias quando há múltiplas conectadas */}
          {/* Usuários com múltiplas instâncias podem ver conversas de todas elas via dropdown */}
          {availableInstances.length > 1 && (
            <div className="flex-shrink-0 border-b border-gray-200/60 bg-gradient-to-r from-white/90 to-blue-50/50 p-3">
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger className="w-full bg-white border-gray-300 text-sm">
                  <SelectValue 
                    placeholder="Todas as instâncias"
                    defaultValue=""
                  />
                </SelectTrigger>
                <SelectContent align="start" className="w-[calc(100%-24px)]">
                  {/* Opção: Todas as instâncias */}
                  <SelectItem value="" className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>📱 Todas as instâncias</span>
                      <span className="text-xs text-gray-500 ml-1">({conversations.length})</span>
                    </span>
                  </SelectItem>

                  {/* Separador */}
                  <div className="my-1 border-t border-gray-200" />

                  {/* Opções: Uma por instância */}
                  {availableInstances.map((instance) => {
                    const instanceConvCount = conversations.filter(
                      c => c.whatsapp_instance_name === instance
                    ).length
                    
                    return (
                      <SelectItem key={instance} value={instance} className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>📱 {instance}</span>
                          <span className="text-xs text-gray-500 ml-1">({instanceConvCount})</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

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
                <Dialog open={showCreateLeadDialog} onOpenChange={setShowCreateLeadDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      title="Adicionar contato ao CRM"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">CRM</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar ao CRM</DialogTitle>
                      <DialogDescription>
                        Criar um novo lead a partir desta conversa
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Nome */}
                      <div>
                        <Label htmlFor="lead-name">Nome *</Label>
                        <Input
                          id="lead-name"
                          value={leadFormData.name}
                          onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                          placeholder={selectedConversation.contact_name}
                          className="mt-1"
                        />
                      </div>

                      {/* Telefone */}
                      <div>
                        <Label htmlFor="lead-phone">Telefone</Label>
                        <Input
                          id="lead-phone"
                          value={leadFormData.phone}
                          onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                          placeholder={selectedConversation.phone_number}
                          className="mt-1"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="lead-email">Email</Label>
                        <Input
                          id="lead-email"
                          type="email"
                          value={leadFormData.email}
                          onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                          placeholder="email@example.com"
                          className="mt-1"
                        />
                      </div>

                      {/* Empresa */}
                      <div>
                        <Label htmlFor="lead-company">Empresa</Label>
                        <Input
                          id="lead-company"
                          value={leadFormData.company}
                          onChange={(e) => setLeadFormData({ ...leadFormData, company: e.target.value })}
                          placeholder="Nome da empresa"
                          className="mt-1"
                        />
                      </div>

                      {/* Cidade */}
                      <div>
                        <Label htmlFor="lead-city">Cidade</Label>
                        <Input
                          id="lead-city"
                          value={leadFormData.city}
                          onChange={(e) => setLeadFormData({ ...leadFormData, city: e.target.value })}
                          placeholder="Cidade"
                          className="mt-1"
                        />
                      </div>

                      {/* Estado */}
                      <div>
                        <Label htmlFor="lead-state">Estado</Label>
                        <Input
                          id="lead-state"
                          value={leadFormData.state}
                          onChange={(e) => setLeadFormData({ ...leadFormData, state: e.target.value })}
                          placeholder="UF"
                          className="mt-1 max-w-[100px]"
                        />
                      </div>

                      {/* Segmento */}
                      <div>
                        <Label htmlFor="lead-segment">Segmento</Label>
                        <Input
                          id="lead-segment"
                          value={leadFormData.segment}
                          onChange={(e) => setLeadFormData({ ...leadFormData, segment: e.target.value })}
                          placeholder="Segmento/Ramo"
                          className="mt-1"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <Label htmlFor="lead-status">Status</Label>
                        <Select 
                          value={leadFormData.status}
                          onValueChange={(value) => setLeadFormData({ ...leadFormData, status: value as any })}
                        >
                          <SelectTrigger id="lead-status" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Novo</SelectItem>
                            <SelectItem value="contacted">Contatado</SelectItem>
                            <SelectItem value="qualified">Qualificado</SelectItem>
                            <SelectItem value="proposal">Proposta</SelectItem>
                            <SelectItem value="won">Ganho</SelectItem>
                            <SelectItem value="lost">Perdido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botões */}
                      <div className="flex gap-3 justify-end pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateLeadDialog(false)}
                          disabled={isCreatingLead}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateLead}
                          disabled={isCreatingLead || !leadFormData.name}
                          className="gap-2"
                        >
                          {isCreatingLead ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Adicionar ao CRM
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

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
                  {messages.map(msg => {
                    // 🎙️ 📷 Renderizar mídia se presente
                    const hasMedia = msg.message_type && msg.message_type !== 'text' && msg.media_data?.url

                    return (
                      <div key={msg.id}>
                        {/* ============================================================ */}
                        {/* RENDERIZAR MÍDIA (áudio, imagem, vídeo, documento) */}
                        {/* ============================================================ */}
                        {hasMedia && (
                          <div className={`flex mb-3 ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                            <MediaMessage
                              type={msg.message_type as 'audio' | 'image' | 'video' | 'document'}
                              data={msg.media_data || {}}
                              direction={msg.isSent ? 'sent' : 'received'}
                              messageId={msg.id}
                              text={msg.text} // Fallback se não conseguir renderizar
                            />
                          </div>
                        )}

                        {/* ============================================================ */}
                        {/* RENDERIZAR TEXTO (incluindo transcrição se houver) */}
                        {/* ============================================================ */}
                        {msg.text && (
                          <div
                            className={`flex mb-2 ${msg.isSent ? 'justify-end' : 'justify-start'}`}
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
                        )}
                      </div>
                    )
                  })}
                  
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
            <div className="bg-white border-t border-gray-200/60 p-4 flex-shrink-0 space-y-3">
              {/* 🎙️ 📷 PASSO 6: Preview de Mídia (se houver) */}
              {mediaPreview.type && (
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      {mediaPreview.type === 'audio' ? '🎙️ Áudio' : '📷 Imagem'}
                    </h3>
                    <button
                      onClick={handleCancelMediaUpload}
                      className="text-gray-500 hover:text-red-500 text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* Preview de Imagem */}
                  {mediaPreview.type === 'image' && mediaPreview.preview && (
                    <div className="mb-3 rounded-lg overflow-hidden max-h-40">
                      <img src={mediaPreview.preview} alt="Preview" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Preview de Áudio */}
                  {mediaPreview.type === 'audio' && mediaPreview.preview && (
                    <div className="mb-3 bg-white p-2 rounded border border-gray-200">
                      <audio
                        src={mediaPreview.preview}
                        controls
                        className="w-full"
                        style={{ height: '32px' }}
                      />
                    </div>
                  )}

                  {/* Nome do Arquivo */}
                  <p className="text-xs text-gray-600 mb-3 break-all">
                    📁 {mediaPreview.file?.name}
                  </p>

                  {/* Caption (Opcional) */}
                  <Input
                    type="text"
                    placeholder="Adicione uma legenda (opcional)"
                    value={mediaPreview.caption}
                    onChange={(e) =>
                      setMediaPreview(prev => ({ ...prev, caption: e.target.value }))
                    }
                    className="mb-3 text-sm"
                  />

                  {/* Erro de Upload */}
                  {uploadError && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                      {uploadError}
                    </div>
                  )}

                  {/* Botões Ação */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendMedia}
                      disabled={isUploadingMedia || !mediaPreview.file}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      {isUploadingMedia ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelMediaUpload}
                      variant="outline"
                      disabled={isUploadingMedia}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Input de Mensagem + Botões */}
              <div className="flex gap-3 items-end" style={{ minHeight: '44px' }}>
                {/* Inputs de Arquivo (Ocultos) */}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      console.log('🎙️ Arquivo de áudio selecionado:', e.target.files[0].name)
                      handleMediaFileSelected(e.target.files[0], 'audio')
                    }
                  }}
                  className="hidden"
                  style={{ display: 'none' }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      console.log('📷 Arquivo de imagem selecionado:', e.target.files[0].name)
                      handleMediaFileSelected(e.target.files[0], 'image')
                    }
                  }}
                  className="hidden"
                  style={{ display: 'none' }}
                />

                {/* Botões de Mídia */}
                <button
                  onClick={() => {
                    console.log('🎙️ Clique no botão de áudio - audioInputRef:', audioInputRef.current)
                    audioInputRef.current?.click()
                  }}
                  disabled={mediaPreview.type !== null || isUploadingMedia}
                  className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-lg transition-colors text-lg flex-shrink-0"
                  style={{
                    opacity: mediaPreview.type !== null || isUploadingMedia ? 0.5 : 1,
                    cursor: mediaPreview.type !== null || isUploadingMedia ? 'not-allowed' : 'pointer',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Enviar áudio"
                  aria-label="Enviar áudio"
                >
                  🎙️
                </button>

                <button
                  onClick={() => {
                    console.log('📷 Clique no botão de imagem - imageInputRef:', imageInputRef.current)
                    imageInputRef.current?.click()
                  }}
                  disabled={mediaPreview.type !== null || isUploadingMedia}
                  className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-lg transition-colors text-lg flex-shrink-0"
                  style={{
                    opacity: mediaPreview.type !== null || isUploadingMedia ? 0.5 : 1,
                    cursor: mediaPreview.type !== null || isUploadingMedia ? 'not-allowed' : 'pointer',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Enviar imagem"
                  aria-label="Enviar imagem"
                >
                  📷
                </button>

                {/* Input de Texto */}
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
                    disabled={mediaPreview.type !== null}
                  />
                </div>

                {/* Botão Enviar Mensagem */}
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim() || mediaPreview.type !== null}
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

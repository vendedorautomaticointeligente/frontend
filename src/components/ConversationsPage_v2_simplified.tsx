import { useState, useCallback, useRef, useEffect } from "react"
import { Search, MoreVertical, Send, Loader2, X, RefreshCw, UserCircle, Trash2 } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "./ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { fetchWithInterceptors } from "../utils/fetchInterceptor"
import { getApiUrl } from "../utils/apiConfig"
import { formatCurrency } from "../utils/formatters"

// ============================================================================
// TYPES - Simples e Diretos
// ============================================================================

type Message = {
  id: string
  text: string
  timestamp: string
  isSent: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
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
  lead?: {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    city: string | null
    state: string | null
    segment: string | null
    status: string
    score: number
    value: number
    source: string | null
  } | null
}

// ============================================================================
// COMPONENTE PRINCIPAL - Simplificado
// ============================================================================

const resolveApiUrl = getApiUrl

export function ConversationsPage() {
  const { accessToken } = useAuth()
  const baseUrl = resolveApiUrl()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // STATE - Apenas 3 coisas necessárias
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // STATE - Filtro por instância (NOVO)
  const [selectedInstance, setSelectedInstance] = useState<string>('all') // 'all' = todas as instâncias
  const [availableInstances, setAvailableInstances] = useState<string[]>([])
  
  // STATE - WhatsApp Connections (para nomes das instâncias)
  const [whatsappConnections, setWhatsappConnections] = useState<any[]>([])
  const [loadingConnections, setLoadingConnections] = useState(false)

  // STATE - CRM Panel
  const [isCrmPanelOpen, setIsCrmPanelOpen] = useState(false)
  const [crmFormData, setCrmFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    segment: '',
    status: 'new',
    source: 'manual_conversation'
  })
  const [isSavingLead, setIsSavingLead] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [newProductData, setNewProductData] = useState({
    name: '',
    recurrence: 'unique',
    price: 0,
    observations: ''
  })
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  
  // 🆕 MEDIA UPLOAD STATES
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [mediaPreview, setMediaPreview] = useState<{
    type: 'audio' | 'image' | null
    file: File | null
    preview: string | null
    caption: string
  }>({ type: null, file: null, preview: null, caption: '' })
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // STATE - Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 🔥 CACHE: Evitar recarregamentos desnecessários
  const messagesCache = useRef<Map<string, Message[]>>(new Map())
  const lastLoadTime = useRef<Map<string, number>>(new Map())

  // ============================================================================
  // FUNÇÃO 1: Carregar Conversas (uma vez no mount)
  // ============================================================================

  const loadConversations = useCallback(async (silent = false) => {
    if (!accessToken) return

    try {
      if (!silent) setLoading(true)

      const response = await safeFetch(
        `${baseUrl}/conversations`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        toast.error('Erro ao carregar conversas')
        return
      }

      const data = await response.json()

      if (data.status === 'success' && data.data?.data) {
        const convs = data.data.data.map((c: any) => ({
          id: c.id,
          phone_number: c.phone_number,
          contact_name: c.contact_name || 'Sem nome',
          avatar: '👤',
          lastMessage: c.last_message || 'Sem mensagens',
          lastMessageTime: c.last_message_at || new Date().toISOString(),
          unread_count: c.unread_count || 0,
          whatsapp_instance_name: c.whatsapp_instance_name,
          lead: c.lead || null
        }))
        setConversations(convs)
        
        // Se não há conversa selecionada, selecionar a primeira
        if (!selectedConversation && convs.length > 0) {
          setSelectedConversation(convs[0])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      toast.error('Erro ao carregar conversas')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [accessToken, baseUrl, selectedConversation])

  // ============================================================================
  // FUNÇÃO 1.5: Carregar Conexões WhatsApp (para nomes das instâncias)
  // ============================================================================

  const loadWhatsAppConnections = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoadingConnections(true)

      const response = await safeFetch(
        `${baseUrl}/whatsapp/connections`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        console.warn('Erro ao carregar conexões WhatsApp')
        return
      }

      const data = await response.json()
      console.log('✅ Conexões WhatsApp carregadas:', data)

      if (data.connections && Array.isArray(data.connections)) {
        console.log('🔍 Todas as conexões (completo):', JSON.stringify(data.connections, null, 2))
        console.log('🔍 Cada conexão detalhada:')
        data.connections.forEach((conn: any, idx: number) => {
          console.log(`  Conexão ${idx}:`, {
            instanceName: conn.instanceName,
            connectionStatus: conn.connectionStatus,
            connectionName: conn.connectionName,
            phoneNumber: conn.phoneNumber
          })
        })
        
        // Filtrar apenas conexões ativas (open)
        const activeConnections = data.connections.filter(
          (conn: any) => conn.connectionStatus === 'open'
        )
        console.log('🔥 Conexões ativas (após filtro):', activeConnections)
        setWhatsappConnections(activeConnections)
      }
    } catch (error) {
      console.error('Erro ao carregar conexões WhatsApp:', error)
    } finally {
      setLoadingConnections(false)
    }
  }, [accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO 2: Carregar Mensagens da Conversa
  // ============================================================================

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accessToken) return

    // 🔥 PROTEÇÃO: Evitar múltiplas chamadas simultâneas
    if (loadingMessages) {
      return
    }

    const conversationId = selectedConversation.id
    const now = Date.now()
    const lastLoad = lastLoadTime.current.get(conversationId) || 0
    const cacheAge = now - lastLoad

    // 🔥 CACHE: Se carregou há menos de 10 segundos E cache existe, usar cache
    // Mas sempre recarregar se não há cache
    if (cacheAge < 10000 && messagesCache.current.has(conversationId)) {
      const cachedMessages = messagesCache.current.get(conversationId)!
      setMessages(cachedMessages)
      return
    }

    // 🔥 Se não há cache, sempre recarregar
    if (!messagesCache.current.has(conversationId)) {
    } else {
    }

    try {
      setLoadingMessages(true)

      const response = await safeFetch(
        `${baseUrl}/conversations/${conversationId}/messages`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: 15000 } // 🔥 REDUZIDO: 15s em vez de 120s para carregamento mais rápido
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

        // 🔥 CACHE: Armazenar no cache
        messagesCache.current.set(conversationId, msgs)
        lastLoadTime.current.set(conversationId, now)

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

    // Mostrar localmente AGORA (otimistic update)
    setMessages(prev => [...prev, {
      id: tempId,
      text: messageText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isSent: true,
      status: 'sent'
    }])

    setMessageInput('')
    setIsSending(true)

    try {
      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ text: messageText })
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        // Remover mensagem se falhar
        setMessages(prev => prev.filter(m => m.id !== tempId))
        toast.error('Erro ao enviar mensagem')
        return
      }

      const data = await response.json()

      if (data.status === 'success') {
        // Substituir mensagem temp pela real
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? { ...m, id: data.id, status: 'sent' }
              : m
          )
        )
        toast.success('Mensagem enviada!')
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        toast.error('Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }, [messageInput, selectedConversation, accessToken, baseUrl, isSending])

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
      setUploadError(validation.error || 'Erro ao validar arquivo')
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
      console.log('📤 Enviando mídia:', {
        type: mediaPreview.type,
        fileName: mediaPreview.file.name,
        fileSize: mediaPreview.file.size,
        endpoint: `${baseUrl}/conversations/${selectedConversation.id}/send-media`
      })

      const response = await fetchWithInterceptors(
        `${baseUrl}/conversations/${selectedConversation.id}/send-media`,
        {
          method: 'POST',
          body: formData
          // Não enviar Authorization aqui - fetchWithInterceptors já adiciona
        }
      )

      if (!response?.ok) {
        console.error('❌ Erro HTTP:', response?.status, response?.statusText)
        const errorText = await response?.text()
        console.error('❌ Resposta do servidor:', errorText)
        setUploadError(`Erro ao enviar mídia. Status: ${response?.status}`)
        return
      }

      const data = await response.json()
      console.log('✅ Resposta do backend:', data)

      if (data.status === 'success') {
        // Limpar preview
        if (mediaPreview.preview) {
          URL.revokeObjectURL(mediaPreview.preview)
        }
        setMediaPreview({ type: null, file: null, preview: null, caption: '' })
        toast.success('Mídia enviada com sucesso!')
      } else {
        console.error('❌ Status não sucesso:', data)
        setUploadError(data.message || 'Erro ao enviar mídia.')
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mídia:', error)
      setUploadError('Erro ao conectar ao servidor. Verifique sua conexão.')
    } finally {
      setIsUploadingMedia(false)
    }
  }, [selectedConversation, mediaPreview, baseUrl, isUploadingMedia])

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
  // EFEITO 1: Carregar conversas uma vez no mount
  // ============================================================================

  useEffect(() => {
    if (accessToken) {
      loadConversations()
      loadWhatsAppConnections()
    }
  }, [accessToken]) // Só executa quando accessToken muda

  // ============================================================================
  // EFEITO 2: Carregar mensagens quando conversa é selecionada
  // ============================================================================

  useEffect(() => {
    if (selectedConversation && accessToken) {
      console.log('📨 [useEffect] Conversa selecionada, carregando mensagens:', selectedConversation.id)
      loadMessages()
    }
  }, [selectedConversation?.id, accessToken, loadMessages]) // Executa quando conversa muda

  // ============================================================================
  // EFEITO 3: Auto-scroll para última mensagem
  // ============================================================================

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ============================================================================
  // EFEITO 4: Sistema SSE Only - Sem Polling
  // ============================================================================

  useEffect(() => {
    if (!accessToken) return

    let sseAttempts = 0
    let sseTimeout: NodeJS.Timeout | null = null

    const upsertConversationFromSSE = (incoming: any) => {
      if (!incoming?.id) return

      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === incoming.id)
        const base: Conversation = {
          id: incoming.id,
          phone_number: incoming.phone_number || '',
          contact_name: incoming.name || incoming.contact_name || incoming.phone_number || 'Sem nome',
          avatar: '👤',
          lastMessage: incoming.last_message || 'Sem mensagens',
          lastMessageTime: incoming.last_message_at || new Date().toISOString(),
          unread_count: incoming.unread_count ?? 0,
          whatsapp_instance_name: incoming.whatsapp_instance_name
        }

        if (idx === -1) {
          return [base, ...prev]
        }

        const updated = { ...prev[idx], ...base }
        const clone = [...prev]
        clone[idx] = updated
        return clone
      })
    }

    const connectSSE = () => {
      try {
        const sseUrl = `${baseUrl}/sse/stream?token=${accessToken}`

        const eventSource = new EventSource(sseUrl, { withCredentials: true })
        eventSourceRef.current = eventSource
        sseAttempts++

        let lastHeartbeat = Date.now()
        let heartbeatTimeout: NodeJS.Timeout | null = null
        let connectionStartTime = Date.now()

        const startHeartbeatMonitor = () => {
          if (heartbeatTimeout) clearTimeout(heartbeatTimeout)
          heartbeatTimeout = setTimeout(() => {
            eventSource.close()
            eventSourceRef.current = null
            handleReconnection()
          }, 45000)
        }

        const handleReconnection = () => {
          if (heartbeatTimeout) clearTimeout(heartbeatTimeout)

          if (sseAttempts < 5) {
            const delay = Math.min(2000 * Math.pow(2, sseAttempts - 1), 30000)
            setTimeout(connectSSE, delay)
          }
        }

        eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse(event.data)
          sseAttempts = 0
          lastHeartbeat = Date.now()
          startHeartbeatMonitor()
          // 🔥 Disparar evento para notificar que SSE está conectado
          window.dispatchEvent(new CustomEvent('sse-connected'))
          console.log('🌐 [SSE] Conectado com sucesso')
        })

        eventSource.addEventListener('heartbeat', (event) => {
          const data = JSON.parse(event.data)
          const now = Date.now()
          lastHeartbeat = now
          startHeartbeatMonitor()
        })

        eventSource.addEventListener('message_received', (event) => {
          const data = JSON.parse(event.data)
          
          // 🔥 HELPER: Normalizar conversation_id para string para comparação consistente
          const normalizeId = (id: any) => String(id)
          const messageConvId = normalizeId(data.conversation_id)
          const selectedConvId = normalizeId(selectedConversation?.id)
          
          if (messageConvId === selectedConvId) {
            setMessages(prev => {
              const messageId = normalizeId(data.message_id || data.id)
              const exists = prev.find(m => normalizeId(m.id) === messageId)
              if (exists) {
                console.log('⚠️ SSE v2: Mensagem duplicada detectada, ignorando', { messageId })
                return prev
              }

              const newMessage: Message = {
                id: messageId,
                text: data.text,
                timestamp: data.created_at || new Date().toISOString(),
                isSent: data.direction === 'sent' || false,
                status: data.direction === 'sent' ? 'sent' : 'read',
                message_type: data.message_type,
                media_data: data.media_data
              }
              return [...prev, newMessage]
            })
          }

          upsertConversationFromSSE(data)
        })

        eventSource.addEventListener('message_accepted', (event) => {
          const data = JSON.parse(event.data)
          const normalizeId = (id: any) => String(id)
          const messageConvId = normalizeId(data.conversation_id)
          const selectedConvId = normalizeId(selectedConversation?.id)
          
          if (messageConvId === selectedConvId) {
            const messageId = normalizeId(data.message_id)
            setMessages(prev => prev.map(m =>
              normalizeId(m.id) === messageId
                ? { ...m, status: 'sending' as const }
                : m
            ))
          }
        })

        eventSource.addEventListener('message_status_update', (event) => {
          const data = JSON.parse(event.data)
          const normalizeId = (id: any) => String(id)
          const messageConvId = normalizeId(data.conversation_id)
          const selectedConvId = normalizeId(selectedConversation?.id)
          
          if (messageConvId === selectedConvId) {
            const messageId = normalizeId(data.message_id)
            setMessages(prev => prev.map(m =>
              normalizeId(m.id) === messageId
                ? { ...m, status: data.status }
                : m
            ))
          }
        })

        eventSource.addEventListener('error', (event) => {
          handleReconnection()
        })

        eventSource.addEventListener('close', (event) => {
          handleReconnection()
        })

      } catch (error) {
        handleReconnection()
      }
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (sseTimeout) clearTimeout(sseTimeout)
    }
  }, [accessToken, baseUrl, selectedConversation?.id])

  // ============================================================================
  // EFEITO 5: Sistema FALLBACK POLLING - Funciona quando SSE falha
  // ============================================================================
  // Se SSE cair por mais de 2 minutos, ativar polling automático

  useEffect(() => {
    if (!accessToken || !selectedConversation?.id) return

    let pollingInterval: NodeJS.Timeout | null = null
    let lastMessageCount = 0

    const startPolling = () => {
      console.log('🔄 [FALLBACK] Iniciando polling para mensagens (SSE indisponível)')
      
      pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `${baseUrl}/conversations/${selectedConversation.id}/messages?limit=50`,
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          )

          if (!response.ok) return

          const data = await response.json()
          const incomingMessages = data.data || data || []

          // 🔥 Comparar com mensagens atuais para detectar novas
          if (incomingMessages.length > lastMessageCount) {
            console.log('✅ [FALLBACK] Novas mensagens detectadas via polling', {
              old_count: lastMessageCount,
              new_count: incomingMessages.length
            })

            setMessages(prev => {
              const normalizeId = (id: any) => String(id)
              const existingIds = new Set(prev.map(m => normalizeId(m.id)))

              const newMessages = incomingMessages
                .filter((m: any) => !existingIds.has(normalizeId(m.id)))
                .map((msg: any) => ({
                  id: normalizeId(msg.id),
                  text: msg.text,
                  timestamp: msg.created_at || new Date().toISOString(),
                  isSent: msg.direction === 'sent',
                  status: msg.status || (msg.direction === 'sent' ? 'sent' : 'read'),
                  message_type: msg.message_type,
                  media_data: msg.media_data
                }))

              if (newMessages.length > 0) {
                return [...prev, ...newMessages]
              }
              return prev
            })
          }

          lastMessageCount = incomingMessages.length
        } catch (error) {
          console.error('❌ [FALLBACK] Erro em polling:', error)
        }
      }, 3000) // Polling a cada 3 segundos
    }

    // 🔥 Detectar quando SSE está offline e iniciar polling
    // Usar um contador para dar 2 minutos de chance ao SSE reconectar
    let sseOfflineSeconds = 0
    const sseOfflineChecker = setInterval(() => {
      sseOfflineSeconds++
      
      // Se SSE offline por mais de 2 minutos, ativar polling
      if (sseOfflineSeconds > 120) {
        if (!pollingInterval) {
          startPolling()
        }
      }
    }, 1000)

    // 🔥 Resetar contador se SSE voltar
    const resetSSECounter = () => {
      sseOfflineSeconds = 0
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
        console.log('🔌 [FALLBACK] SSE restaurado, parando polling')
      }
    }

    // Monitorar se SSE está funcionando
    window.addEventListener('sse-connected', resetSSECounter)

    return () => {
      clearInterval(sseOfflineChecker)
      if (pollingInterval) clearInterval(pollingInterval)
      window.removeEventListener('sse-connected', resetSSECounter)
    }
  }, [accessToken, baseUrl, selectedConversation?.id])


  // ============================================================================
  // FUNÇÕES CRM
  // ============================================================================

  // ============================================================================
  // FUNÇÃO PARA CARREGAR PRODUTOS DISPONÍVEIS
  // ============================================================================

  const loadAvailableProducts = useCallback(async () => {
    if (!accessToken) return

    try {
      setIsLoadingProducts(true)

      const response = await safeFetch(
        `${baseUrl}/products`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        console.error('Erro ao carregar produtos')
        return
      }

      const data = await response.json()

      if (data.products) {
        setAvailableProducts(data.products)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO PARA CARREGAR PRODUTOS DO LEAD
  // ============================================================================

  const loadLeadProducts = useCallback(async (leadId: string) => {
    if (!accessToken || !leadId) return

    try {
      const response = await safeFetch(
        `${baseUrl}/crm/leads/${leadId}/products`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        console.error('Erro ao carregar produtos do lead')
        return
      }

      const data = await response.json()

      if (data.success && data.products) {
        setSelectedProductIds(data.products.map((p: any) => p.id))
      }
    } catch (error) {
      console.error('Erro ao carregar produtos do lead:', error)
    }
  }, [accessToken, baseUrl])

  // ============================================================================
  // FUNÇÃO PARA CRIAR NOVO PRODUTO
  // ============================================================================

  const createProduct = useCallback(async () => {
    if (!accessToken || !newProductData.name.trim()) return

    try {
      setIsSavingProduct(true)

      const response = await safeFetch(
        `${baseUrl}/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newProductData)
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        const errorData = await response?.json()
        throw new Error(errorData?.message || 'Erro ao criar produto')
      }

      const data = await response.json()

      if (data.product) {
        toast.success('Produto criado com sucesso!')
        
        // Adicionar o novo produto à lista disponível
        setAvailableProducts(prev => [...prev, data.product])
        
        // Selecionar automaticamente o produto recém-criado
        setSelectedProductIds(prev => [...prev, data.product.id])
        
        // Resetar formulário
        setNewProductData({
          name: '',
          recurrence: 'unique',
          price: 0,
          observations: ''
        })
        
        setIsCreatingProduct(false)
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar produto')
    } finally {
      setIsSavingProduct(false)
    }
  }, [accessToken, baseUrl, newProductData])

  const toggleCrmPanel = useCallback(() => {
    if (!selectedConversation) return

    // Se painel já está aberto, apenas fechar
    if (isCrmPanelOpen) {
      setIsCrmPanelOpen(false)
      return
    }

    // Caso contrário, preencher dados e abrir

    // Preencher formulário com dados existentes do lead ou dados da conversa
    if (selectedConversation.lead) {
      setCrmFormData({
        name: selectedConversation.lead.name || selectedConversation.contact_name,
        company: selectedConversation.lead.company || '',
        email: selectedConversation.lead.email || '',
        phone: selectedConversation.lead.phone || selectedConversation.phone_number,
        city: selectedConversation.lead.city || '',
        state: selectedConversation.lead.state || '',
        segment: selectedConversation.lead.segment || '',
        status: selectedConversation.lead.status || 'new',
        source: selectedConversation.lead.source || 'manual_conversation'
      })
      // Carregar produtos do lead existente
      loadLeadProducts(selectedConversation.lead.id.toString())
    } else {
      // Novo lead - preencher com dados da conversa
      setCrmFormData({
        name: selectedConversation.contact_name,
        company: '',
        email: '',
        phone: selectedConversation.phone_number,
        city: '',
        state: '',
        segment: '',
        status: 'new',
        source: 'manual_conversation'
      })
      // Resetar produtos selecionados
      setSelectedProductIds([])
    }

    // Carregar produtos disponíveis se ainda não carregados
    if (availableProducts.length === 0) {
      loadAvailableProducts()
    }

    setIsCrmPanelOpen(true)
  }, [selectedConversation, isCrmPanelOpen, loadLeadProducts, loadAvailableProducts, availableProducts.length])

  const closeCrmPanel = useCallback(() => {
    setIsCrmPanelOpen(false)
  }, [])

  // ============================================================================
  // EFEITO 2: Carregar mensagens quando conversa muda
  // ============================================================================

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
      // Painel CRM não abre automaticamente - apenas ao clicar no ícone
    }
  }, [selectedConversation, loadMessages])

  const saveLead = useCallback(async () => {
    if (!selectedConversation || !accessToken) return

    try {
      setIsSavingLead(true)

      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/lead`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(crmFormData)
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        const errorData = await response?.json()
        throw new Error(errorData?.message || 'Erro ao salvar lead')
      }

      const data = await response.json()

      if (data.status === 'success') {
        toast.success(selectedConversation.lead ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!')

        // Vincular produtos se houver algum selecionado
        if (selectedProductIds.length > 0 && data.data.lead?.id) {
          try {
            const linkResponse = await safeFetch(
              `${baseUrl}/crm/leads/${data.data.lead.id}/products`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ product_ids: selectedProductIds })
              },
              { timeout: FETCH_DEFAULT_TIMEOUT }
            )

            if (linkResponse?.ok) {
              const linkData = await linkResponse.json()
              if (linkData.success) {
                // Atualizar lead com produtos vinculados
                data.data.lead = linkData.lead
              }
            }
          } catch (linkError) {
            console.error('Erro ao vincular produtos:', linkError)
            toast.warning('Lead salvo, mas houve erro ao vincular produtos')
          }
        }

        // Atualizar conversa localmente com os dados do lead
        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, lead: data.data.lead }
            : conv
        ))

        // Atualizar selectedConversation
        setSelectedConversation(prev => prev ? { ...prev, lead: data.data.lead } : null)

        closeCrmPanel()
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar lead')
    } finally {
      setIsSavingLead(false)
    }
  }, [selectedConversation, accessToken, baseUrl, crmFormData, selectedProductIds, closeCrmPanel])

  const removeLead = useCallback(async () => {
    if (!selectedConversation || !accessToken || !selectedConversation.lead) return

    try {
      setIsSavingLead(true)

      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}/lead`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        const errorData = await response?.json()
        throw new Error(errorData?.message || 'Erro ao remover lead')
      }

      const data = await response.json()

      if (data.status === 'success') {
        toast.success('Lead removido com sucesso!')

        // Atualizar conversa localmente removendo o lead
        setConversations(prev => prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, lead: null }
            : conv
        ))

        // Atualizar selectedConversation
        setSelectedConversation(prev => prev ? { ...prev, lead: null } : null)

        closeCrmPanel()
      } else {
        throw new Error(data.message || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao remover lead:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover lead')
    } finally {
      setIsSavingLead(false)
    }
  }, [selectedConversation, accessToken, baseUrl, closeCrmPanel])

  // ============================================================================
  // FUNÇÃO: Deletar Conversa (Soft Delete - Arquivo Morto)
  // ============================================================================

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation || !accessToken) return

    try {
      setIsDeleting(true)

      const response = await safeFetch(
        `${baseUrl}/conversations/${selectedConversation.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response?.ok) {
        const errorData = await response?.json()
        throw new Error(errorData?.message || 'Erro ao excluir conversa')
      }

      const data = await response.json()

      if (data.success) {
        // Remover conversa da lista localmente
        setConversations(prev => prev.filter(conv => conv.id !== selectedConversation.id))
        
        // Selecionar a primeira conversa restante ou null
        setSelectedConversation(null)
        
        // Limpar mensagens
        setMessages([])
        
        // Fechar dialog
        setIsDeleteDialogOpen(false)
        
        toast.success('Conversa excluída com sucesso')
      } else {
        throw new Error(data.message || 'Erro ao excluir conversa')
      }
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conversa')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedConversation, accessToken, baseUrl])

  // ============================================================================
  // RENDER: Lista de Conversas
  // ============================================================================

  // 🔥 Atualizar instâncias disponíveis a partir das conexões WhatsApp ativas
  useEffect(() => {
    console.log('📊 whatsappConnections mudou:', whatsappConnections)
    
    // Usar conexões WhatsApp ao invés de extrair das conversas
    const instances = whatsappConnections
      .filter(conn => conn.instanceName) // Garantir que tem instanceName
      .map(conn => conn.instanceName)
    
    console.log('📱 Instâncias extraídas:', instances)
    setAvailableInstances(instances)
    
    // Se a instância selecionada foi deletada, voltar para "all"
    if (selectedInstance !== 'all' && !instances.includes(selectedInstance)) {
      console.log('⚠️ Instância selecionada não existe mais, voltando para "all"')
      setSelectedInstance('all')
    }
  }, [whatsappConnections])

  const filteredConversations = conversations.filter(c => {
    // Filtro de busca
    const matchesSearch = c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_number.includes(searchQuery)

    // Filtro de instância (NOVO) - 'all' = mostrar todas
    const matchesInstance = selectedInstance === 'all' || c.whatsapp_instance_name === selectedInstance

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
        {/* Conversations List - Coluna estreita */}
        <div className="w-64 bg-white/60 backdrop-blur-sm border-r border-gray-200/60 flex flex-col shadow-lg overflow-hidden flex-shrink-0">
          {/* DEBUG: Log do estado */}
          {console.log('🔍 DEBUG Dropdown:', { availableInstances, whatsappConnections, selectedInstance })}
          
          {/* Instance Dropdown Filter - NOVO */}
          {/* 🔥 Mostrar filtro de instâncias quando há múltiplas conectadas */}
          {availableInstances.length >= 1 && (
            <div className="flex-shrink-0 border-b border-gray-200/60 bg-gradient-to-r from-white/90 to-blue-50/50 p-3">
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger className="w-full bg-white border-gray-300 text-sm">
                  <SelectValue 
                    placeholder="Todas as instâncias"
                  />
                </SelectTrigger>
                <SelectContent align="start" className="w-full">
                  {/* Opção: Todas as instâncias */}
                  <SelectItem value="all" className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>📱 Todas as instâncias</span>
                      <span className="text-xs text-gray-500 ml-1">({conversations.length})</span>
                    </span>
                  </SelectItem>

                  {/* Separador */}
                  <div className="my-1 border-t border-gray-200" />

                  {/* Opções: Uma por instância */}
                  {availableInstances.map((instanceName) => {
                    // Buscar a conexão correspondente para obter o nome configurado
                    const connection = whatsappConnections.find(
                      conn => conn.instanceName === instanceName
                    )
                    
                    // Nome da conexão (configurado pelo usuário) ou fallback para instanceName
                    const displayName = connection?.connectionName || instanceName
                    
                    // Contar conversas desta instância
                    const instanceConvCount = conversations.filter(
                      c => c.whatsapp_instance_name === instanceName
                    ).length
                    
                    return (
                      <SelectItem key={instanceName} value={instanceName} className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>📱 {displayName}</span>
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
          <div className="p-4 border-b border-gray-200/60 space-y-3 bg-gradient-to-r from-white/90 to-blue-50/50 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus:outline-none focus:ring-0 text-sm"
              />
            </div>
          </div>

          {/* Conversations - Layout compacto */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-sm">Nenhuma conversa</p>
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
                  <div className="flex items-start gap-2">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="text-xs">{conv.contact_name[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {conv.contact_name}
                        </p>
                        <p className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(conv.lastMessageTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {conv.phone_number}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - Ocupa maior parte da tela */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header - Compacto */}
            <div className="bg-white border-b border-gray-200/60 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">{selectedConversation.contact_name[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {selectedConversation.contact_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.phone_number}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCrmPanel}
                  className={`h-8 w-8 p-0 ${isCrmPanelOpen ? 'bg-blue-100 text-blue-600' : ''}`}
                  title={selectedConversation.lead ? 'Editar lead no CRM' : 'Criar lead no CRM'}
                >
                  <UserCircle className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir conversa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Nenhuma mensagem</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-md px-3 py-2 rounded-lg
                        ${msg.isSent
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-900 rounded-bl-none'
                        }
                        ${msg.status === 'sending' ? 'opacity-75' : ''}
                      `}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.isSent ? 'text-blue-100' : 'text-gray-600'}`}>
                        <p className="text-xs">{msg.timestamp}</p>
                        {msg.status === 'sending' && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {msg.status === 'failed' && (
                          <X className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Compacto */}
            <div className="bg-white border-t border-gray-200/60 p-3 flex-shrink-0 space-y-3">
              {/* 🎙️ 📷 PASSO 5: Preview de Mídia (se houver) */}
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

                  {/* Preview de Imagem - Thumbnail Responsivo */}
                  {mediaPreview.type === 'image' && mediaPreview.preview && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={mediaPreview.preview} 
                        alt="Preview" 
                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-cover rounded" 
                      />
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

              {/* Input de Texto + Botão Enviar */}
              <div className="flex items-end gap-2">
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
                    className="border-0 bg-transparent focus:ring-0 text-sm"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className="bg-blue-500 hover:bg-blue-600 h-10 w-10 p-0 flex-shrink-0"
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

        {/* CRM Panel - Coluna lateral */}
        {isCrmPanelOpen && selectedConversation && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
            {/* CRM Super Header - Tarja com título */}
            <div className="bg-blue-600 text-white px-4 py-2 flex-shrink-0">
              <h2 className="font-semibold text-sm">CADASTRO DE OPORTUNIDADE</h2>
            </div>

            {/* CRM Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-sm">
                {selectedConversation.lead ? 'Editar Lead' : 'Criar Lead'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeCrmPanel}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* CRM Form */}
            <div className="flex-1 overflow-y-auto pt-0 px-4 pb-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    type="text"
                    value={crmFormData.name}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do contato"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <Input
                    type="text"
                    value={crmFormData.company}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Nome da empresa"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={crmFormData.email}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    type="text"
                    value={crmFormData.phone}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <Input
                      type="text"
                      value={crmFormData.city}
                      onChange={(e) => setCrmFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="São Paulo"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <Input
                      type="text"
                      value={crmFormData.state}
                      onChange={(e) => setCrmFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="SP"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Segmento
                  </label>
                  <Input
                    type="text"
                    value={crmFormData.segment}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, segment: e.target.value }))}
                    placeholder="Ex: Tecnologia, Varejo..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={crmFormData.status}
                    onChange={(e) => setCrmFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">Novo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Qualificado</option>
                    <option value="proposal">Proposta</option>
                    <option value="won">Ganho</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>
              </div>

              {/* Seção de Produtos */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Produtos/Serviços</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingProduct(!isCreatingProduct)}
                    className="text-xs"
                  >
                    {isCreatingProduct ? 'Cancelar' : '+ Novo Produto'}
                  </Button>
                </div>

                {isCreatingProduct && (
                  <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Criar Novo Produto</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <Input
                          type="text"
                          value={newProductData.name}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome do produto"
                          className="text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Recorrência *
                          </label>
                          <select
                            value={newProductData.recurrence}
                            onChange={(e) => setNewProductData(prev => ({ ...prev, recurrence: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="unique">Único</option>
                            <option value="recurring">Recorrente</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Preço (R$) *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newProductData.price}
                            onChange={(e) => setNewProductData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Observações
                        </label>
                        <Input
                          type="text"
                          value={newProductData.observations}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, observations: e.target.value }))}
                          placeholder="Observações opcionais"
                          className="text-sm"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={createProduct}
                        disabled={isSavingProduct || !newProductData.name.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSavingProduct ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Criando...
                          </>
                        ) : (
                          'Criar Produto'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="ml-2 text-xs text-gray-500">Carregando produtos...</span>
                  </div>
                ) : availableProducts.length === 0 && !isCreatingProduct ? (
                  <p className="text-xs text-gray-500">Nenhum produto disponível. Clique em "+ Novo Produto" para criar.</p>
                ) : (
                  <div className="space-y-2">
                    {availableProducts.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(product.price)} - {product.recurrence === 'recurring' ? 'Recorrente' : 'Único'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={selectedProductIds.includes(product.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedProductIds(prev =>
                              prev.includes(product.id)
                                ? prev.filter(id => id !== product.id)
                                : [...prev, product.id]
                            )
                          }}
                          className="text-xs"
                        >
                          {selectedProductIds.includes(product.id) ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CRM Actions */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              <Button
                onClick={saveLead}
                disabled={isSavingLead || !crmFormData.name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingLead ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  selectedConversation.lead ? 'Atualizar Lead' : 'Criar Lead'
                )}
              </Button>

              {selectedConversation.lead && (
                <Button
                  onClick={removeLead}
                  disabled={isSavingLead}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  {isSavingLead ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Removendo...
                    </>
                  ) : (
                    'Remover Lead'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa com <strong>{selectedConversation?.contact_name}</strong> será excluída. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-blue-600 hover:bg-blue-700 text-white border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              style={{
                backgroundColor: '#dc2626',
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

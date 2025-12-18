import { useState } from "react"
import { useEffect, useRef } from "react"
import { Search, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Check, CheckCheck, Clock, X, MessageCircle, Loader2, Send, Filter, Settings, Users, Zap } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"

// Types
type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'voip'

type Message = {
  id: string
  text: string
  timestamp: string
  isSent: boolean
  status?: 'sent' | 'delivered' | 'read'
  isAudio?: boolean
  duration?: string
  media_data?: string
  message_type?: string
}

type Conversation = {
  id: string
  name: string
  company?: string
  avatar: string
  channel: Channel
  lastMessage: string
  lastMessageTime: string
  unread: number
  online: boolean
  messages: Message[]
  phone?: string
  email?: string
  segment?: string
  whatsappInstanceName?: string
  phoneNumber?: string
}

// Mock data - Conversas simuladas
const mockConversations: Conversation[] = []

const channelConfig = {
  whatsapp: {
    color: 'bg-green-500',
    name: 'WhatsApp',
    icon: '💬'
  },
  instagram: {
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
    name: 'Instagram DM',
    icon: '📸'
  },
  messenger: {
    color: 'bg-blue-500',
    name: 'Messenger',
    icon: '💬'
  },
  voip: {
    color: 'bg-vai-blue-tech',
    name: 'VoIP',
    icon: '📞'
  }
}

export function ConversationsPage() {
  const { accessToken } = useAuth()
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  
  // 🔥 REF PARA AUTO-SCROLL DAS MENSAGENS
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [sseConnected, setSseConnected] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)
  const [instanceNamesMap, setInstanceNamesMap] = useState<Record<string, string>>({})


  // 🔥 AUTO-SCROLL PARA A ÚLTIMA MENSAGEM QUANDO NOVA CHEGAR
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 🔥 SSE LISTENER - Receber mensagens em tempo real quando webhook dispara
  useEffect(() => {
    if (!accessToken) return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connectSSE = () => {
      try {
        // Usar URL com token como query parameter (EventSource não suporta headers)
        const sseUrl = `${baseUrl}/sse/stream`
        console.log('📡 Conectando ao SSE:', sseUrl)
        
        // Criar EventSource com configuração apropriada
        eventSource = new EventSource(sseUrl, {
          withCredentials: true // Permite enviar cookies e headers de autenticação
        })

        // Listener para evento de conexão
        eventSource.addEventListener('connected', (event) => {
          console.log('✅ Conectado ao stream SSE')
          setSseConnected(true)
        })

        // Listener para mensagens recebidas
        eventSource.addEventListener('message_received', (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 Mensagem recebida via SSE:', data)

            // Verificar se é da conversa atualmente aberta
            if (selectedConversation && data.conversation_id === selectedConversation.id) {
              // Adicionar mensagem ao estado IMEDIATAMENTE
              const newMessage: Message = {
                id: data.message.id,
                text: data.message.text,
                timestamp: new Date(data.message.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                isSent: data.message.direction === 'sent',
                status: data.message.direction === 'sent' ? 'read' : undefined,
                media_data: data.message.media_data,
                message_type: data.message.message_type
              }

              setMessages(prev => {
                // Evitar duplicatas
                if (prev.find(m => m.id === newMessage.id)) {
                  return prev
                }
                console.log('➕ Adicionando nova mensagem ao estado')
                return [...prev, newMessage]
              })

              // Atualizar última mensagem da conversa na lista
              setConversations(prev =>
                prev.map(conv =>
                  conv.id === selectedConversation.id
                    ? {
                        ...conv,
                        lastMessage: data.message.text || '(sem texto)',
                        lastMessageTime: data.conversation.last_message_at,
                        unread: data.message.direction === 'sent' ? conv.unread : conv.unread + 1
                      }
                    : conv
                )
              )
            } else if (data.conversation_id) {
              // Se não é a conversa aberta, apenas atualizar na lista
              setConversations(prev =>
                prev.map(conv =>
                  conv.id === data.conversation_id
                    ? {
                        ...conv,
                        lastMessage: data.conversation.last_message,
                        lastMessageTime: data.conversation.last_message_at,
                        unread: data.message.direction === 'received' ? conv.unread + 1 : conv.unread
                      }
                    : conv
                )
              )
            }
          } catch (error) {
            console.error('❌ Erro ao processar mensagem SSE:', error)
          }
        })

        // Listener para heartbeat
        eventSource.addEventListener('heartbeat', (event) => {
          console.log('💓 Heartbeat recebido')
        })

        // Listener para erro
        eventSource.onerror = (error) => {
          console.error('❌ Erro na conexão SSE:', error)
          setSseConnected(false)

          // Fechar conexão em erro
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Reconectar em 5 segundos
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Tentando reconectar SSE...')
            connectSSE()
          }, 5000)
        }
      } catch (error) {
        console.error('❌ Erro ao conectar SSE:', error)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [accessToken, baseUrl, selectedConversation])

  // 🔥 CARREGAR INSTÂNCIAS COM NOMES CONFIGURADOS PELO USUÁRIO
  useEffect(() => {
    const fetchInstancesWithNames = async () => {
      try {
        if (!accessToken) return

        console.log('📱 Carregando instâncias com nomes...')
        const response = await fetch(`${baseUrl}/whatsapp/instances-with-names`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!response.ok) {
          console.log('❌ Erro ao carregar instâncias:', response.status)
          return
        }

        const data = await response.json()

        if (data.success && data.instances) {
          // Criar mapa de instanceName -> connectionName
          const namesMap: Record<string, string> = {}
          data.instances.forEach((instance: any) => {
            namesMap[instance.instanceName] = instance.connectionName || instance.profileName || instance.phoneNumber
          })

          console.log('✅ Instâncias carregadas:', Object.keys(namesMap).length)
          console.log('📋 Mapa de nomes:', namesMap)
          setInstanceNamesMap(namesMap)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar instâncias com nomes:', error)
      }
    }

    if (accessToken) {
      fetchInstancesWithNames()
    }
  }, [accessToken, baseUrl])

  // 🔥 CARREGAR CONVERSAS REAIS DA API
  useEffect(() => {
    const fetchConversations = async (showLoading = true) => {
      try {
        if (showLoading && !loading) setLoading(true)
        // Log apenas na primeira requisição
        if (showLoading) {
          console.log('🌐 Fazendo requisição para:', `${baseUrl}/conversations`)
        }
        const response = await fetch(`${baseUrl}/conversations`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        
        // Log status apenas se houver erro
        if (!response.ok) {
          console.log('❌ Response status:', response.status)
        }
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Erro na requisição:', response.status, errorText)
          return
        }
        
        const data = await response.json()
        // Log detalhado apenas na primeira carga
        if (showLoading) {
          console.log('📊 Conversas carregadas:', data.data?.data?.length || 0)
        }
        
        if (data.status === 'success' && data.data && data.data.data) {
          // Converter dados da API para formato do componente
          const mapped = data.data.data.map((conv: any) => ({
            id: conv.id,
            name: conv.contact_name || conv.phone_number || 'Sem nome',
            avatar: '👤',
            channel: 'whatsapp' as Channel,
            lastMessage: conv.last_message || 'Sem mensagens',
            lastMessageTime: conv.last_message_at || new Date().toISOString(),
            unread: conv.unread_count || 0,
            online: true,
            messages: [],
            phoneNumber: conv.phone_number,
            whatsappInstanceName: conv.whatsapp_instance_name
          }))
          
          console.log('🔄 Conversas carregadas:', mapped.length)
          
          // 🔥 MERGE INTELIGENTE: Ao fazer polling, atualiza apenas conversas que mudaram
          // Em vez de substituir todo o array (causando re-render de tudo)
          if (showLoading === false && conversations.length > 0) {
            // Polling: fazer merge inteligente
            setConversations(prev => {
              const merged = [...prev]
              
              mapped.forEach(newConv => {
                const existingIndex = merged.findIndex(c => c.id === newConv.id)
                
                if (existingIndex >= 0) {
                  // Atualizar apenas campos que mudaram
                  merged[existingIndex] = {
                    ...merged[existingIndex],
                    lastMessage: newConv.lastMessage,
                    lastMessageTime: newConv.lastMessageTime,
                    unread: newConv.unread
                  }
                } else {
                  // Adicionar nova conversa
                  merged.push(newConv)
                }
              })
              
              // Remover conversas que não existem mais na API
              return merged.filter(existing =>
                mapped.some(m => m.id === existing.id)
              )
            })
          } else {
            // Primeira carga: substituir tudo
            setConversations(mapped)
          }
          
          // Selecionar primeira conversa APENAS na primeira carga (quando não há histórico de seleção)
          const currentSelected = selectedConversation
          const stillExists = currentSelected && mapped.find(c => c.id === currentSelected.id)
          
          // Só selecionar automaticamente se:
          // 1. Não há conversa selecionada E é a primeira carga (conversations estava vazio)
          // 2. OU se a conversa selecionada não existe mais
          if (mapped.length > 0 && !currentSelected && conversations.length === 0) {
            console.log('✅ Primeira carga: selecionando conversa:', mapped[0].name)
            setSelectedConversation(mapped[0])
          } else if (currentSelected && !stillExists && mapped.length > 0) {
            console.log('⚠️ Conversa selecionada não existe mais, selecionando primeira:', mapped[0].name)
            setSelectedConversation(mapped[0])
          }
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error)
        if (conversations.length === 0) {
          toast.error('Erro ao carregar conversas')
        }
      } finally {
        if (showLoading) setLoading(false)
      }
    }

    if (accessToken) {
      console.log('🔑 Token disponível, carregando conversas...', accessToken.substring(0, 10) + '...')
      fetchConversations()
      
      // 🔥 REMOVIDO: Polling de 30 segundos
      // SSE (Server-Sent Events) já fornece atualizações em tempo real
      // Polling causava re-renders visuais desnecessários
      
      return () => {
        // Cleanup se necessário
      }
    } else {
      console.log('❌ SEM TOKEN! Usuário não está logado ou token não foi carregado')
    }
  }, [accessToken, baseUrl])

  // Carregar mensagens da conversa selecionada + SSE para tempo real
  useEffect(() => {
    const fetchMessages = async (showLoading = true) => {
      if (!selectedConversation || !accessToken) return
      
      try {
        if (showLoading) setLoadingMessages(true)
        const response = await fetch(`${baseUrl}/conversations/${selectedConversation.id}/messages`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const data = await response.json()
        
        if (data.status === 'success' && data.data) {
          console.log('📱 Mensagens recebidas para conversa', selectedConversation.id, ':', data.data.length, 'mensagens')
          const formattedMessages = data.data.map((msg: any) => ({
            id: msg.id,
            text: msg.text,
            timestamp: new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            isSent: msg.direction === 'sent',
            status: msg.direction === 'sent' ? 'read' : undefined,
            media_data: msg.media_data,
            message_type: msg.message_type
          }))
          if (showLoading) {
            console.log('✅ Mensagens processadas:', formattedMessages.length)
          }
          setMessages(formattedMessages)
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
      } finally {
        if (showLoading) setLoadingMessages(false)
      }
    }

    // Carregar mensagens iniciais
    fetchMessages()
  }, [selectedConversation, baseUrl, accessToken])

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Filtrar por instância selecionada (se houver)
    if (selectedInstance && conv.whatsappInstanceName !== selectedInstance) {
      return false
    }
    
    // Se não há pesquisa, mostrar todas da instância
    if (!searchQuery.trim()) return true
    
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Obter lista única de instâncias conectadas
  const connectedInstances = Array.from(new Set(
    conversations
      .map(c => c.whatsappInstanceName)
      .filter((instance): instance is string => !!instance)
  )).sort()
  
  // Log apenas quando há mudança significativa
  if (conversations.length !== filteredConversations.length) {
    console.log('🔍 Filtro aplicado:', {
      total: conversations.length,
      filtered: filteredConversations.length,
      searchQuery,
      selectedInstance
    })
  }

  // Função para inserir emoji
  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Função para iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        handleSendAudio(blob)
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Erro ao acessar microfone:', error)
      toast.error('Erro ao acessar o microfone')
    }
  }

  // Função para parar gravação
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setMediaRecorder(null)
      setIsRecording(false)
    }
  }

  // Função para enviar áudio
  const handleSendAudio = async (audioBlob: Blob) => {
    if (!selectedConversation) return
    
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')
    
    try {
      const response = await fetch(`${baseUrl}/conversations/${selectedConversation.id}/send-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      })
      
      if (response.ok) {
        toast.success('Áudio enviado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
      toast.error('Erro ao enviar áudio')
    }
  }

  // Função para excluir conversa
  const handleDeleteConversation = async (conversation: Conversation) => {
    setConversationToDelete(conversation)
    setShowDeleteModal(true)
  }

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return
    
    try {
      const response = await fetch(`${baseUrl}/conversations/${conversationToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id))
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(conversations[0] || null)
        }
        toast.success('Conversa excluída com sucesso!')
      } else {
        toast.error('Erro ao excluir conversa')
      }
    } catch (error) {
      toast.error('Erro ao excluir conversa')
    } finally {
      setShowDeleteModal(false)
      setConversationToDelete(null)
    }
  }

  // Função para renderizar mensagem baseada no tipo
  const renderMessageContent = (message: Message) => {
    // Se tem media_data, renderize baseado no tipo
    if (message.media_data && message.message_type) {
      try {
        const mediaData = JSON.parse(message.media_data)
        
        switch (message.message_type) {
          case 'image':
            return (
              <div className="space-y-2">
                <img 
                  src={mediaData.url} 
                  alt={mediaData.filename || 'Imagem'}
                  className="max-w-xs rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(mediaData.url, '_blank')}
                />
                {mediaData.caption && (
                  <p className="text-sm">{mediaData.caption}</p>
                )}
              </div>
            )
          case 'audio':
            return (
              <div className="space-y-2">
                <audio controls className="max-w-xs">
                  <source src={mediaData.url} type="audio/mpeg" />
                  Seu navegador não suporta áudio.
                </audio>
                {mediaData.caption && (
                  <p className="text-sm">{mediaData.caption}</p>
                )}
              </div>
            )
          case 'video':
            return (
              <div className="space-y-2">
                <video controls className="max-w-xs rounded-lg shadow-sm">
                  <source src={mediaData.url} type="video/mp4" />
                  Seu navegador não suporta vídeo.
                </video>
                {mediaData.caption && (
                  <p className="text-sm">{mediaData.caption}</p>
                )}
              </div>
            )
          case 'document':
            return (
              <div className="space-y-2 p-3 border rounded-lg bg-gray-50 max-w-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-sm">{mediaData.filename || 'Documento'}</p>
                    {mediaData.filesize && (
                      <p className="text-xs text-gray-500">{(mediaData.filesize / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </div>
                <a 
                  href={mediaData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline"
                >
                  Baixar arquivo
                </a>
                {mediaData.caption && (
                  <p className="text-sm">{mediaData.caption}</p>
                )}
              </div>
            )
          case 'sticker':
            return (
              <div className="space-y-2">
                <img 
                  src={mediaData.url} 
                  alt="Sticker"
                  className="max-w-24 max-h-24 rounded-lg"
                />
              </div>
            )
          default:
            // Fallback para tipos não reconhecidos
            return <p className="text-sm leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{message.text}</p>
        }
      } catch (e) {
        console.error('Erro ao parsear media_data:', e)
        // Fallback em caso de erro
        return <p className="text-sm leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{message.text}</p>
      }
    }

    // Mensagem de texto normal
    return <p className="text-sm leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{message.text}</p>
  }

  // Função para enviar arquivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedConversation) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    fetch(`${baseUrl}/conversations/${selectedConversation.id}/send-media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    })
    .then(response => response.ok ? toast.success('Arquivo enviado!') : toast.error('Erro ao enviar arquivo'))
    .catch(() => toast.error('Erro ao enviar arquivo'))
    
    event.target.value = ''
    setShowAttachmentMenu(false)
  }

  // Modal component for delete confirmation
  const DeleteModal = () => showDeleteModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluir conversa</h3>
        <p className="text-gray-600 mb-6">
          Tem certeza que deseja excluir a conversa com {conversationToDelete?.contact_name || conversationToDelete?.phone_number}?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteConversation}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  ) : null

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return
    
    try {
      const response = await fetch(`${baseUrl}/conversations/${selectedConversation.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ text: messageInput })
      })
      
      const data = await response.json()
      
      if (data.status === 'success') {
        // Adicionar mensagem localmente SEM recarregar
        const newMessage: Message = {
          id: data.data.id,
          text: messageInput,
          timestamp: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          isSent: true,
          status: 'sent'
        }
        
        // Apenas adicionar, não recarregar tudo (elimina flicker)
        setMessages(prev => [...prev, newMessage])
        setMessageInput('')        
        toast.success('Mensagem enviada com sucesso!', {
          style: {
            background: '#f0f9ff',
            color: '#1f2937',
            border: '1px solid #e0e7ff'
          }
        })
      } else {
        toast.error(`❌ ${data.message || 'Erro ao enviar mensagem'}`)
      }
    } catch (error) {
      console.error('Erro ao enviar:', error)
      toast.error('Erro ao enviar mensagem')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 px-6 py-3 shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Conversas WhatsApp
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm text-xs">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse" />
                {conversations.filter(c => c.online).length} online
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm text-xs">
                {conversations.reduce((acc, c) => acc + c.unread, 0)} pendentes
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="hover:bg-blue-50 hover:text-blue-600 rounded-lg"
              title="Atualizar conversas"
            >
              <Loader2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Enhanced Conversations List - LARGURA FIXA */}
        <div className="w-80 xl:w-96 bg-white/60 backdrop-blur-sm border-r border-gray-200/60 flex flex-col shadow-lg overflow-hidden flex-shrink-0" style={{ maxWidth: '380px', minWidth: '320px' }}>
          {/* Enhanced Search */}
          <div className="p-5 border-b border-gray-200/60 space-y-4 bg-gradient-to-r from-white/90 to-blue-50/50 flex-shrink-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <Input
                placeholder="Pesquisar conversas, contatos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/70 border-gray-200/60 focus:border-blue-300 focus:ring-blue-200/50 rounded-lg shadow-sm transition-all duration-200"
              />
            </div>

            {/* Instance Filter - Mostrar apenas se houver múltiplas instâncias */}
            {connectedInstances.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedInstance(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedInstance === null
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📱 Todos ({conversations.length})
                </button>
                {connectedInstances.map((instance) => {
                  const count = conversations.filter(c => c.whatsappInstanceName === instance).length
                  const displayName = instanceNamesMap[instance] || instance.slice(-6)
                  return (
                    <button
                      key={instance}
                      onClick={() => setSelectedInstance(instance)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedInstance === instance
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`Instância: ${instance}`}
                    >
                      {displayName} ({count})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Enhanced Conversations List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <MessageCircle className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-gray-600 mt-6 text-sm font-medium">Carregando suas conversas...</p>
                <p className="text-gray-400 text-xs mt-1">Aguarde um momento</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <MessageCircle className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma conversa encontrada</h3>
                <p className="text-gray-500 text-sm text-center">Tente ajustar os filtros ou aguarde novas mensagens</p>
              </div>
            ) : (
              filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                className={`transition-all duration-300 ease-out ${
                  selectedConversation?.id === conversation.id ? 'transform scale-[0.98]' : ''
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 flex items-start gap-4 transition-all duration-200 border-b border-gray-100/60 group relative overflow-hidden ${
                    selectedConversation?.id === conversation.id 
                      ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/8 to-blue-500/5 border-l-4 border-l-blue-500' 
                      : 'hover:bg-white/70 hover:shadow-sm'
                  }`}
                  style={{ maxWidth: '100%' }}
                >
                {/* Enhanced Avatar with channel indicator */}
                <div className="relative flex-shrink-0">
                  <div className="relative">
                    <Avatar className="w-14 h-14 ring-2 ring-white shadow-lg">
                      <AvatarFallback className={`text-lg font-bold transition-all duration-200 ${
                        selectedConversation?.id === conversation.id 
                          ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                          : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 group-hover:from-blue-50 group-hover:to-indigo-50 group-hover:text-blue-600'
                      }`}>
                        {conversation.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${channelConfig[conversation.channel].color} rounded-full flex items-center justify-center text-xs shadow-lg border-3 border-white transform hover:scale-110 transition-transform`}>
                      {channelConfig[conversation.channel].icon}
                    </div>
                    {conversation.online && (
                      <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm">
                        <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-vai-text-primary truncate font-medium">
                          {conversation.name}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 flex-shrink-0">
                          📱 {conversation.whatsappInstanceName && instanceNamesMap[conversation.whatsappInstanceName] ? instanceNamesMap[conversation.whatsappInstanceName] : (conversation.whatsappInstanceName?.slice(-6) || 'N/A')}
                        </span>
                      </div>
                      {conversation.company && (
                        <p className="text-xs text-vai-text-secondary truncate">
                          {conversation.company}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conversation)
                        }}
                        className="w-6 h-6 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(conversation.lastMessageTime).toLocaleDateString('pt-BR')}
                      </span>
                      {conversation.unread > 0 && (
                        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs min-w-[1.25rem] h-5 px-2 shadow-md animate-pulse">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mt-1 ${
                    selectedConversation?.id === conversation.id 
                      ? 'text-blue-700 font-medium' 
                      : 'text-slate-600 group-hover:text-slate-700'
                  }`} style={{ 
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-all',
                    maxWidth: '100%',
                    width: '100%'
                  }}>
                    {conversation.lastMessage}
                  </p>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/3 group-hover:to-blue-500/5 transition-all duration-300" />
                </div>
              </button>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Enhanced Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50 relative min-h-0">
            {/* Enhanced Chat Header - FIXO */}
            <div className="bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-vai-blue-light text-vai-blue-tech">
                      {selectedConversation.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {selectedConversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-vai-text-primary">
                      {selectedConversation.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`${channelConfig[selectedConversation.channel].color} text-white border-0 text-xs`}
                    >
                      {channelConfig[selectedConversation.channel].name}
                    </Badge>
                    {selectedConversation.phoneNumber && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        📱 +{selectedConversation.phoneNumber}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-vai-text-secondary mt-1">
                    {selectedConversation.company && (
                      <span>{selectedConversation.company}</span>
                    )}
                    {selectedConversation.segment && (
                      <>
                        <span>•</span>
                        <span>{selectedConversation.segment}</span>
                      </>
                    )}
                    {selectedConversation.online ? (
                      <span className="text-green-600">● Online</span>
                    ) : (
                      <span>Offline</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area - Scrollable com altura fixa */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Inicie a conversa enviando uma mensagem</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isSent ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  >
                    <div
                      className={`max-w-[70%] relative px-4 py-3 shadow-sm ${
                        message.isSent
                          ? 'bg-green-500 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm'
                      }`}
                      style={{
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Pontinha do balão */}
                      <div className={`absolute bottom-0 w-0 h-0 ${
                        message.isSent
                          ? 'right-0 translate-x-0 border-l-[12px] border-l-green-500 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                          : 'left-0 -translate-x-0 border-r-[12px] border-r-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                      }`} />
                      
                      {renderMessageContent(message)}
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <span className={`text-xs ${
                          message.isSent ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {message.timestamp}
                        </span>
                        {message.isSent && message.status && (
                          <>
                            {message.status === 'sent' && <Clock className="w-3 h-3 text-white/80" />}
                            {message.status === 'delivered' && <Check className="w-3 h-3 text-white/80" />}
                            {message.status === 'read' && <CheckCheck className="w-3 h-3 text-white" />}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {/* Ref para auto-scroll - sempre no final da lista */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex gap-2 relative">
                  {/* Emoji Button */}
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                    >
                      <Smile className="w-5 h-5" />
                    </Button>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border rounded-lg shadow-lg p-3 w-64 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-1">
                          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','🤢','🤮','🤧','😷','🤒','🤕','🤠','😎','🤓','🧐','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','🦵','🦿','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'].map((emoji, i) => (
                            <button
                              key={i}
                              onClick={() => insertEmoji(emoji)}
                              className="w-6 h-6 text-lg hover:bg-gray-100 rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Attachment Button */}
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    
                    {/* Attachment Menu */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border rounded-lg shadow-lg py-2 w-48">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                            className="hidden"
                          />
                          📸 Foto ou Vídeo
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                            className="hidden"
                          />
                          📄 Documento
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="pr-12 py-2 bg-gray-50/50 border-gray-200/60 focus:border-blue-300 focus:ring-blue-200/50 rounded-lg resize-none transition-all duration-200"
                    style={{ minHeight: '38px' }}
                  />
                  {messageInput.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="text-xs text-blue-500 font-medium">
                        {messageInput.length}/10000
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="px-3 xl:px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <Send className="w-4 h-4 xl:mr-2" />
                  <span className="hidden xl:inline">Enviar</span>
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={`rounded-lg transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'hover:bg-blue-50 hover:text-blue-600'
                  }`}
                  title={isRecording ? 'Solte para enviar áudio' : 'Pressione e segure para gravar áudio'}
                >
                  <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
              
              {/* Quick Actions - Simplified for small screens */}
              <div className="hidden xl:flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>💡 <strong>Dica:</strong> Use Shift+Enter para quebra de linha</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span>Conectado via {channelConfig[selectedConversation.channel].name}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 relative h-full">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-50" />
            
            <div className="text-center relative z-10 max-w-md mx-auto px-6">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Centro de Conversas
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Selecione uma conversa para começar a interagir com seus clientes
                </p>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400/5 to-indigo-400/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl" />
          </div>
        )}
      </div>
      <DeleteModal />
    </div>
  )
}

import { useState } from "react"
import { Search, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Check, CheckCheck, Clock, X } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"

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
}

// Mock data - Conversas simuladas
const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    company: 'TechStart Soluções',
    avatar: 'CS',
    channel: 'whatsapp',
    lastMessage: 'Sim, tenho interesse! Pode me enviar mais detalhes?',
    lastMessageTime: '10:32',
    unread: 2,
    online: true,
    phone: '(11) 98765-4321',
    email: 'carlos@techstart.com',
    segment: 'Tecnologia',
    messages: [
      {
        id: 'm1',
        text: 'Olá! Vi que vocês trabalham com automação de vendas. Pode me falar mais?',
        timestamp: '10:15',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Olá Carlos! Claro, o VAI é uma plataforma completa de vendas automáticas. Posso agendar uma demo?',
        timestamp: '10:20',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm3',
        text: 'Quanto custa a ferramenta? Tem período de teste?',
        timestamp: '10:28',
        isSent: false
      },
      {
        id: 'm4',
        text: 'Temos planos a partir de R$ 297/mês com 7 dias de trial gratuito! Quer testar?',
        timestamp: '10:30',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm5',
        text: 'Sim, tenho interesse! Pode me enviar mais detalhes?',
        timestamp: '10:32',
        isSent: false
      }
    ]
  },
  {
    id: '2',
    name: 'Marina Costa',
    company: 'Bella Estética',
    avatar: 'MC',
    channel: 'instagram',
    lastMessage: 'Perfeito! Vou avaliar com minha equipe',
    lastMessageTime: '09:45',
    unread: 0,
    online: false,
    phone: '(11) 97654-3210',
    email: 'contato@bellaestetica.com',
    segment: 'Estética',
    messages: [
      {
        id: 'm1',
        text: 'Oi! Vi seu post sobre automação. Minha clínica precisa disso!',
        timestamp: '09:20',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Oi Marina! Que ótimo! O VAI automatiza todo processo de captação e follow-up. Quantos clientes você atende por mês?',
        timestamp: '09:25',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm3',
        text: 'Cerca de 200 clientes. Mas perco muito tempo com agendamentos e lembretes',
        timestamp: '09:35',
        isSent: false
      },
      {
        id: 'm4',
        text: 'O VAI resolve isso! Automatiza agendamentos, lembretes e até recupera clientes inativos. Posso te mostrar?',
        timestamp: '09:40',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm5',
        text: 'Perfeito! Vou avaliar com minha equipe',
        timestamp: '09:45',
        isSent: false
      }
    ]
  },
  {
    id: '3',
    name: 'Roberto Almeida',
    company: 'Construtora RAA',
    avatar: 'RA',
    channel: 'messenger',
    lastMessage: 'Vocês integram com CRM?',
    lastMessageTime: 'Ontem',
    unread: 1,
    online: false,
    phone: '(11) 96543-2109',
    email: 'roberto@construtorara.com',
    segment: 'Construção',
    messages: [
      {
        id: 'm1',
        text: 'Bom dia! Preciso de uma solução para gerenciar leads de imóveis',
        timestamp: 'Ontem 16:20',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Bom dia Roberto! O VAI é perfeito para isso. Gera leads, qualifica e automatiza o follow-up. Já usa algum CRM?',
        timestamp: 'Ontem 16:35',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm3',
        text: 'Uso o RD Station. Vocês integram com CRM?',
        timestamp: 'Ontem 16:50',
        isSent: false
      }
    ]
  },
  {
    id: '4',
    name: 'Juliana Mendes',
    company: 'FitPro Academia',
    avatar: 'JM',
    channel: 'whatsapp',
    lastMessage: 'Obrigada! Vou pensar',
    lastMessageTime: 'Ontem',
    unread: 0,
    online: false,
    phone: '(11) 95432-1098',
    email: 'juliana@fitpro.com',
    segment: 'Fitness',
    messages: [
      {
        id: 'm1',
        text: 'Oi! Quantos leads consigo gerar por mês?',
        timestamp: 'Ontem 14:10',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Oi Juliana! Depende do seu plano. No plano Pro você pode gerar até 5.000 leads/mês!',
        timestamp: 'Ontem 14:20',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm3',
        text: 'Nossa! E o preço?',
        timestamp: 'Ontem 14:25',
        isSent: false
      },
      {
        id: 'm4',
        text: 'Plano Pro é R$ 497/mês. Posso te dar 30% de desconto no primeiro mês! 😊',
        timestamp: 'Ontem 14:30',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm5',
        text: 'Obrigada! Vou pensar',
        timestamp: 'Ontem 14:40',
        isSent: false
      }
    ]
  },
  {
    id: '5',
    name: 'Paulo Santos',
    company: 'Advocacia Santos & Silva',
    avatar: 'PS',
    channel: 'voip',
    lastMessage: 'Ligação de 3m 45s',
    lastMessageTime: '2 dias',
    unread: 0,
    online: false,
    phone: '(11) 94321-0987',
    email: 'paulo@santossilva.adv',
    segment: 'Jurídico',
    messages: [
      {
        id: 'm1',
        text: '📞 Chamada de voz recebida',
        timestamp: '2 dias 11:30',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Olá Sr. Paulo, obrigado pelo contato! Vou enviar a proposta por email',
        timestamp: '2 dias 11:34',
        isSent: true,
        status: 'delivered'
      },
      {
        id: 'm3',
        text: '🎤 Áudio gravado',
        timestamp: '2 dias 11:35',
        isSent: false,
        isAudio: true,
        duration: '3:45'
      }
    ]
  },
  {
    id: '6',
    name: 'Ana Paula',
    company: 'Clínica Odonto+',
    avatar: 'AP',
    channel: 'whatsapp',
    lastMessage: 'Perfeito! Vamos fechar',
    lastMessageTime: '3 dias',
    unread: 0,
    online: false,
    phone: '(11) 93210-9876',
    email: 'ana@odontomais.com',
    segment: 'Odontologia',
    messages: [
      {
        id: 'm1',
        text: 'Oi! Me interessei pelo VAI. Como funciona o onboarding?',
        timestamp: '3 dias 15:00',
        isSent: false
      },
      {
        id: 'm2',
        text: 'Oi Ana! É super simples: 1) Cadastro 2) Importar contatos 3) Configurar agentes 4) Ativar campanhas',
        timestamp: '3 dias 15:10',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm3',
        text: 'Quanto tempo leva?',
        timestamp: '3 dias 15:15',
        isSent: false
      },
      {
        id: 'm4',
        text: 'Em média 30 minutos! E temos suporte completo para te ajudar 😊',
        timestamp: '3 dias 15:20',
        isSent: true,
        status: 'read'
      },
      {
        id: 'm5',
        text: 'Perfeito! Vamos fechar',
        timestamp: '3 dias 15:25',
        isSent: false
      }
    ]
  }
]

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
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')

  // Filter conversations
  const filteredConversations = mockConversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    // In real app, would send message here
    setMessageInput('')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-vai-text-primary mb-1">Conversas</h1>
            <p className="text-sm text-vai-text-secondary">Gestão de conversas multi-canal</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              {mockConversations.filter(c => c.online).length} online
            </Badge>
            <Badge variant="outline" className="bg-vai-blue-light text-vai-blue-tech border-vai-blue-tech/20">
              {mockConversations.reduce((acc, c) => acc + c.unread, 0)} não lidas
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedConversation?.id === conversation.id ? 'bg-vai-blue-light/30' : ''
                }`}
              >
                {/* Avatar with channel indicator */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-vai-blue-light text-vai-blue-tech">
                      {conversation.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${channelConfig[conversation.channel].color} rounded-full flex items-center justify-center text-[10px] border-2 border-white`}>
                    {channelConfig[conversation.channel].icon}
                  </div>
                  {conversation.online && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-vai-text-primary truncate">
                        {conversation.name}
                      </p>
                      {conversation.company && (
                        <p className="text-xs text-vai-text-secondary truncate">
                          {conversation.company}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-vai-text-secondary ml-2 flex-shrink-0">
                      {conversation.lastMessageTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-vai-text-secondary truncate flex-1">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unread > 0 && (
                      <Badge className="ml-2 bg-vai-blue-tech text-white flex-shrink-0">
                        {conversation.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.isSent
                        ? 'bg-vai-blue-tech text-white'
                        : 'bg-white text-vai-text-primary border border-gray-200'
                    }`}
                  >
                    {message.isAudio ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isSent ? 'bg-white/20' : 'bg-vai-blue-light'}`}>
                          <Mic className={`w-4 h-4 ${message.isSent ? 'text-white' : 'text-vai-blue-tech'}`} />
                        </div>
                        <div className="flex-1">
                          <div className={`h-1 rounded-full ${message.isSent ? 'bg-white/30' : 'bg-vai-blue-light'} mb-1`}>
                            <div className={`h-full w-1/2 rounded-full ${message.isSent ? 'bg-white' : 'bg-vai-blue-tech'}`} />
                          </div>
                          <span className={`text-xs ${message.isSent ? 'text-white/70' : 'text-vai-text-secondary'}`}>
                            {message.duration}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{message.text}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-xs ${message.isSent ? 'text-white/70' : 'text-vai-text-secondary'}`}>
                        {message.timestamp}
                      </span>
                      {message.isSent && (
                        <>
                          {message.status === 'sent' && <Clock className="w-3 h-3 text-white/70" />}
                          {message.status === 'delivered' && <Check className="w-3 h-3 text-white/70" />}
                          {message.status === 'read' && <CheckCheck className="w-3 h-3 text-white" />}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Smile className="w-5 h-5 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </Button>
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-vai-blue-tech hover:bg-vai-blue-tech/90 text-white"
                >
                  Enviar
                </Button>
                <Button variant="ghost" size="icon">
                  <Mic className="w-5 h-5 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-vai-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-12 h-12 text-vai-blue-tech" />
              </div>
              <h3 className="text-xl text-vai-text-primary mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-vai-text-secondary">
                Escolha uma conversa para visualizar as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

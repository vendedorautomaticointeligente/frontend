import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { readJsonCache, writeJsonCache } from "../utils/localCache"
import { getApiUrl } from '../utils/apiConfig'
import {
  Send,
  ArrowLeft,
  Calendar,
  Users,
  Bot,
  MessageSquare,
  Mail,
  FileText
} from "lucide-react"

interface ListData {
  id: string
  name: string
  total_contacts: number
}

interface AgentData {
  id: string
  name: string
  tone: string
}

interface CampaignData {
  id: string
  name: string
  description?: string
  listId: string
  agentId: string
  channel: string
  whatsappConnectionId?: string
  scheduledDate?: string
  initialMessage?: string
  start_time?: string
  end_time?: string
}

const CAMPAIGN_LISTS_CACHE_KEY = "campaigns_lists_cache"
const CAMPAIGN_AGENTS_CACHE_KEY = "campaigns_agents_cache"
const CAMPAIGN_CONNECTIONS_CACHE_KEY = "campaigns_whatsapp_cache"

interface CreateCampaignPageProps {
  onBack: () => void
}

export function CreateCampaignPage({ onBack }: CreateCampaignPageProps) {
  const { accessToken } = useAuth()

  // Form state
  const [campaignName, setCampaignName] = useState("")
  const [campaignDescription, setCampaignDescription] = useState("")
  const [selectedList, setSelectedList] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp' | 'dm' | 'messenger'>('whatsapp')
  const [selectedWhatsAppConnection, setSelectedWhatsAppConnection] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [initialMessage, setInitialMessage] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("18:00")
  const [isCreating, setIsCreating] = useState(false)
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)

  // Available data for selection
  const [availableLists, setAvailableLists] = useState<ListData[]>(() => readJsonCache<ListData[]>(CAMPAIGN_LISTS_CACHE_KEY) ?? [])
  const [availableAgents, setAvailableAgents] = useState<AgentData[]>(() => readJsonCache<AgentData[]>(CAMPAIGN_AGENTS_CACHE_KEY) ?? [])
  const [availableConnections, setAvailableConnections] = useState<WhatsAppConnection[]>(() => readJsonCache<WhatsAppConnection[]>(CAMPAIGN_CONNECTIONS_CACHE_KEY) ?? [])
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignData[]>([])

  // Load available data
  useEffect(() => {
    loadAvailableData()
    
    // Check if there's campaign data to edit
    const editData = localStorage.getItem('editCampaignData')
    if (editData) {
      try {
        const campaign = JSON.parse(editData)
        loadCampaignData(campaign)
        localStorage.removeItem('editCampaignData') // Clean up
      } catch (error) {
        console.error('Error loading campaign edit data:', error)
      }
    }
  }, [])

  const loadAvailableData = async () => {
    try {
      // Load lists
      const listsResponse = await safeFetch(`${getApiUrl()}/lists`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FETCH_DEFAULT_TIMEOUT
      })

      if (listsResponse.ok) {
        const listsData = await listsResponse.json()
        const lists = listsData.lists || []
        setAvailableLists(lists)
        writeJsonCache(CAMPAIGN_LISTS_CACHE_KEY, lists)
      }

      // Load agents
      const agentsResponse = await safeFetch(`${getApiUrl()}/agents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FETCH_DEFAULT_TIMEOUT
      })

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        const agents = agentsData.agents || []
        setAvailableAgents(agents)
        writeJsonCache(CAMPAIGN_AGENTS_CACHE_KEY, agents)
      }

      // Load WhatsApp connections
      const connectionsResponse = await safeFetch(`${getApiUrl()}/whatsapp/connections`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FETCH_DEFAULT_TIMEOUT
      })

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json()
        const connections = connectionsData.connections || []
        setAvailableConnections(connections)
        writeJsonCache(CAMPAIGN_CONNECTIONS_CACHE_KEY, connections)
      }

      // Load previous campaigns for template loading
      const campaignsResponse = await safeFetch(`${getApiUrl()}/campaigns`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FETCH_DEFAULT_TIMEOUT
      })

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        const campaigns = campaignsData.campaigns || []
        setAvailableCampaigns(campaigns.slice(0, 10)) // Limit to last 10 campaigns
      }
    } catch (error) {
      console.error('Erro ao carregar dados disponíveis:', error)
      toast.error('Erro ao carregar dados. Tente novamente.')
    }
  }

  const resetForm = () => {
    setCampaignName("")
    setCampaignDescription("")
    setSelectedList("")
    setSelectedAgent("")
    setSelectedChannel('whatsapp')
    setSelectedWhatsAppConnection("")
    setScheduledDate("")
    setInitialMessage("")
    setStartTime("08:00")
    setEndTime("18:00")
    setIsEditing(false)
    setEditingCampaignId(null)
  }

  // Estado para variáveis disponíveis - campos fixos baseados na visualização das listas
  const availableVariables = ['empresa', 'email', 'telefone', 'website', 'endereco', 'cidade', 'estado']

  // Estado para o primeiro contato da lista (para preview)
  const [previewContact, setPreviewContact] = useState<any>(null)

  // Carregar primeiro contato da lista para preview
  useEffect(() => {
    const loadPreviewContact = async () => {
      if (selectedList) {
        try {
          const response = await safeFetch(`${getApiUrl()}/lists/${selectedList}/contacts?limit=1`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (response && response.ok) {
            const contactsData = await response.json()
            const contacts = contactsData.contacts || []
            setPreviewContact(contacts.length > 0 ? contacts[0] : null)
          } else {
            setPreviewContact(null)
          }
        } catch (error) {
          console.error('Erro ao carregar contato para preview:', error)
          setPreviewContact(null)
        }
      } else {
        setPreviewContact(null)
      }
    }

    loadPreviewContact()
  }, [selectedList, accessToken])

  // Função para inserir variável na mensagem
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('initialMessage') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end, text.length)
      const newText = before + `{{${variable}}}` + after
      setInitialMessage(newText)
      
      // Reposicionar o cursor após a variável inserida
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4 // +4 para {{}}
        textarea.focus()
      }, 0)
    }
  }

  // Função para carregar dados da campanha anterior
  const loadCampaignData = (campaign: CampaignData) => {
    setCampaignName(campaign.name || '')
    setCampaignDescription(campaign.description || '')
    setSelectedList(campaign.listId || '')
    setSelectedAgent(campaign.agentId || '')
    setSelectedChannel((campaign.channel as 'email' | 'whatsapp' | 'dm' | 'messenger') || 'whatsapp')
    setSelectedWhatsAppConnection(campaign.whatsappConnectionId || '')
    setScheduledDate(campaign.scheduledDate || '')
    setInitialMessage(campaign.message || campaign.initialMessage || '') // Try both field names
    setStartTime(campaign.start_time || '08:00')
    setEndTime(campaign.end_time || '18:00')
    
    // Set edit mode
    setIsEditing(true)
    setEditingCampaignId(campaign.id)
    
    toast.success(`Editando campanha "${campaign.name}"`)
  }

  // Função para obter o rótulo amigável da variável
  const getVariableLabel = (variable: string) => {
    const labels: { [key: string]: string } = {
      'empresa': 'Empresa',
      'email': 'Email',
      'telefone': 'Telefone',
      'website': 'Website',
      'endereco': 'Endereço',
      'cidade': 'Cidade',
      'estado': 'Estado'
    }
    return labels[variable] || variable.charAt(0).toUpperCase() + variable.slice(1)
  }

  // As variáveis são fixas baseadas na visualização das listas

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Preencha o nome da campanha')
      return
    }

    if (!campaignDescription.trim()) {
      toast.error('Preencha a descrição da campanha')
      return
    }

    if (!selectedList) {
      toast.error('Selecione uma lista de contatos')
      return
    }

    if (!selectedAgent) {
      toast.error('Selecione um agente')
      return
    }

    if (selectedChannel === 'whatsapp' && !selectedWhatsAppConnection) {
      toast.error('Selecione uma conexão WhatsApp')
      return
    }

    if (!initialMessage.trim()) {
      toast.error('Preencha a mensagem inicial')
      return
    }

    if (!startTime || !endTime) {
      toast.error('Defina o horário de funcionamento')
      return
    }

    setIsCreating(true)

    try {
      const campaignData = {
        name: campaignName.trim(),
        description: campaignDescription.trim(),
        listId: selectedList, // Campo correto esperado pelo backend
        agentId: selectedAgent.toString(), // Backend espera string
        channel: selectedChannel,
        whatsappConnectionId: selectedChannel === 'whatsapp' ? selectedWhatsAppConnection : null,
        scheduledDate: scheduledDate,
        initialMessage: initialMessage.trim(),
        start_time: startTime,
        end_time: endTime
      }

      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing 
        ? `${getApiUrl()}/campaigns/${editingCampaignId}` 
        : `${getApiUrl()}/campaigns`

      const response = await safeFetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData),
        timeout: FETCH_DEFAULT_TIMEOUT
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData?.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} campanha`
        throw new Error(message)
      }

      const result = await response.json()

      toast.success(`Campanha ${isEditing ? 'atualizada' : 'criada'} com sucesso!`)
      resetForm()
      onBack() // Voltar para a página de campanhas

    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast.error(`Erro ao criar campanha: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return MessageSquare
      case 'email':
        return Mail
      default:
        return Send
    }
  }

  const ChannelIcon = getChannelIcon(selectedChannel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? 'Editar Campanha' : 'Criar Nova Campanha'}</h1>
            <p className="text-muted-foreground">{isEditing ? 'Atualize as configurações da campanha' : 'Configure sua campanha de disparos'}</p>
          </div>
        </div>

        {/* Load Previous Campaign */}
        {availableCampaigns.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label className="text-sm font-medium">Carregar dados da campanha anterior</Label>
                  <p className="text-xs text-muted-foreground">Use uma campanha existente como template</p>
                </div>
                <Select onValueChange={(campaignId) => {
                  const campaign = availableCampaigns.find(c => c.id === campaignId)
                  if (campaign) loadCampaignData(campaign)
                }}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione uma campanha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Configurações da Campanha
            </CardTitle>
            <CardDescription>
              Defina os parâmetros da sua campanha de marketing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Linha 1: Nome da Campanha | Descrição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Prospecção Q1 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Descreva o objetivo desta campanha..."
                  rows={3}
                />
              </div>
            </div>

            {/* Linha 2: Conexão Whatsapp | Agente de Atendimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Conexão WhatsApp *
                </Label>
                <Select value={selectedWhatsAppConnection} onValueChange={setSelectedWhatsAppConnection}>
                  <SelectTrigger id="whatsapp">
                    <SelectValue placeholder="Selecione uma conexão WhatsApp">
                      {selectedWhatsAppConnection && availableConnections.find(c => c.id === selectedWhatsAppConnection)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnections.length === 0 ? (
                      <SelectItem value="no-connections" disabled>
                        Nenhuma conexão disponível - Configure WhatsApp primeiro
                      </SelectItem>
                    ) : (
                      availableConnections.map(connection => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.connectionName || connection.instanceName} ({connection.phoneNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent" className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Agente de Atendimento *
                </Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.length === 0 ? (
                      <SelectItem value="no-agents" disabled>
                        Nenhum agente disponível - Crie um agente primeiro
                      </SelectItem>
                    ) : (
                      availableAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.tone})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 3: Lista de Contatos | Data de Início | Horário de Funcionamento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="list" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Lista de Contatos *
                </Label>
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger id="list">
                    <SelectValue placeholder="Selecione uma lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLists.length === 0 ? (
                      <SelectItem value="no-lists" disabled>
                        Nenhuma lista disponível - Crie uma lista primeiro
                      </SelectItem>
                    ) : (
                      availableLists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.total_contacts} contatos)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Início *
                </Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeRange" className="font-semibold">Horário de Funcionamento *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:00"
                  />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="18:00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Defina o horário de funcionamento da campanha</p>
              </div>
            </div>

            {/* Linha 4: Mensagem Inicial */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem Inicial *</Label>
              <Textarea
                id="initialMessage"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Digite a mensagem que será enviada para iniciar a conversa..."
                rows={4}
              />
              
              {/* Botões de variáveis disponíveis - só aparecem após seleção da lista */}
              {selectedList && availableVariables.length > 0 && (
                <div className="mt-2">
                  <Label className="text-sm text-gray-600 mb-2 block">
                    Variáveis disponíveis (clique para inserir):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map(variable => (
                      <Button
                        key={variable}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                        className="text-xs h-7 px-2"
                        title={`Inserir {{${variable}}}`}
                      >
                        {getVariableLabel(variable)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preview da mensagem */}
              {initialMessage.trim() && selectedList && previewContact && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Preview da mensagem (baseado em {previewContact.empresa || previewContact.nome || 'contato'}):
                  </Label>
                  <div className="bg-white p-3 rounded border text-sm font-mono leading-relaxed">
                    {(() => {
                      // Mapeamento das variáveis portuguesas para os campos reais do contato
                      const variableMapping: { [key: string]: string } = {
                        'empresa': 'extra_data.company', // ou 'name' como fallback
                        'email': 'email',
                        'telefone': 'phone',
                        'website': 'website',
                        'endereco': 'extra_data.address', // ou 'address' como fallback
                        'cidade': 'city',
                        'estado': 'state'
                      }
                      
                      // Função para obter o valor do campo do contato
                      const getContactValue = (fieldPath: string) => {
                        const parts = fieldPath.split('.')
                        let value = previewContact
                        for (const part of parts) {
                          value = value?.[part]
                          if (value === undefined || value === null) break
                        }
                        return value
                      }
                      
                      // Espelho exato da mensagem, preservando quebras de linha e substituindo variáveis
                      let previewText = initialMessage
                      
                      // Substitui cada variável encontrada pelos dados reais do contato
                      previewText = previewText.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
                        const fieldPath = variableMapping[variable]
                        if (fieldPath) {
                          const value = getContactValue(fieldPath)
                          if (value !== undefined && value !== null && value !== '') {
                            return value
                          }
                        }
                        // Se não tem o campo ou está vazio, mostra o nome da variável entre colchetes
                        return `[${variable}]`
                      })
                      
                      // Divide por quebras de linha e renderiza cada linha separadamente
                      return previewText.split('\n').map((line, index) => (
                        <div key={index} className="min-h-[1.2em]">
                          {line || '\u00A0' /* Non-breaking space for empty lines */}
                        </div>
                      ))
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Este preview usa dados reais do primeiro contato da lista selecionada
                  </p>
                </div>
              )}
            </div>

            {/* Create Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCampaign}
                disabled={isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditing ? 'Atualizando...' : 'Criando...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isEditing ? 'Atualizar Campanha' : 'Criar Campanha'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
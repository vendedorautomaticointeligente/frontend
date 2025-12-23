import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Checkbox } from "./ui/checkbox"
import { useAuth } from "../hooks/useAuthLaravel"
import { formatDate } from "../utils/formatters"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { readJsonCache, writeJsonCache } from "../utils/localCache"
import { getApiUrl } from '../utils/apiConfig'
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2,
  Play,
  Pause,
  ArrowRight,
  List,
  Bot,
  Send,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Loader2,
  MessageSquare,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  AlertCircle,
  RefreshCw
} from "lucide-react"

interface Automation {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  
  // Step 1: Select List
  selectedListId: string
  selectedListName: string
  
  // Step 2: Agent
  selectedAgent: string
  agentId: string
  
  // Step 3: First Message
  firstMessage: string
  
  // Step 4: Channels
  channels: string[]
  
  // Step 5: Follow-up
  followUpEnabled: boolean
  followUpDays: number
  followUpMessage: string
  
  executionsTotal: number
  listsGenerated: number
  campaignsSent: number
  repliesProcessed: number
  lastRun: string | null
  createdAt: string
}

interface SavedList {
  id: string
  name: string
  type: string
  contactsCount: number
  createdAt: string
}

const AUTOMATIONS_CACHE_KEY = "automations_cache"
const AUTOMATIONS_META_CACHE_KEY = "automations_cache_meta"
const AUTOMATION_LISTS_CACHE_KEY = "automations_lists_cache"
const AUTOMATION_AGENTS_CACHE_KEY = "automations_agents_cache"

export function Automations() {
  const { accessToken } = useAuth()
  const [automations, setAutomations] = useState<Automation[]>(() => readJsonCache<Automation[]>(AUTOMATIONS_CACHE_KEY) ?? [])
  const [savedLists, setSavedLists] = useState<SavedList[]>(() => readJsonCache<SavedList[]>(AUTOMATION_LISTS_CACHE_KEY) ?? [])
  const [agents, setAgents] = useState<any[]>(() => readJsonCache<any[]>(AUTOMATION_AGENTS_CACHE_KEY) ?? [])
  const [loading, setLoading] = useState(automations.length === 0)
  const [loadingLists, setLoadingLists] = useState(savedLists.length === 0)
  const [showNewAutomationDialog, setShowNewAutomationDialog] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)
  const [lastAutomationsSync, setLastAutomationsSync] = useState<string | null>(() => {
    const meta = readJsonCache<{ lastSync?: string }>(AUTOMATIONS_META_CACHE_KEY)
    return meta?.lastSync ? new Date(meta.lastSync).toLocaleTimeString() : null
  })
  const [automationError, setAutomationError] = useState<string | null>(null)
  const [listsError, setListsError] = useState<string | null>(null)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [isRefreshingAutomations, setIsRefreshingAutomations] = useState(false)
  
  // Form fields
  const [automationName, setAutomationName] = useState("")
  const [automationDescription, setAutomationDescription] = useState("")
  const [selectedListId, setSelectedListId] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [firstMessage, setFirstMessage] = useState("")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [followUpEnabled, setFollowUpEnabled] = useState(true)
  const [followUpDays, setFollowUpDays] = useState(3)
  const [followUpMessage, setFollowUpMessage] = useState("")

  const channelOptions = [
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'dm', label: 'Instagram DM', icon: Instagram },
    { value: 'messenger', label: 'Messenger', icon: Facebook }
  ]

  const baseUrl = getApiUrl()
  
  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  const persistAutomations = (items: Automation[]) => {
    setAutomations(items)
    writeJsonCache(AUTOMATIONS_CACHE_KEY, items)
    const now = new Date()
    writeJsonCache(AUTOMATIONS_META_CACHE_KEY, { lastSync: now.toISOString() })
    setLastAutomationsSync(now.toLocaleTimeString())
  }

  const persistLists = (lists: SavedList[]) => {
    setSavedLists(lists)
    writeJsonCache(AUTOMATION_LISTS_CACHE_KEY, lists)
  }

  const persistAgents = (agentsList: any[]) => {
    setAgents(agentsList)
    writeJsonCache(AUTOMATION_AGENTS_CACHE_KEY, agentsList)
  }

  type LoadAutomationsOptions = {
    silent?: boolean
  }

  useEffect(() => {
    if (!accessToken) return
    loadAutomations()
    loadSavedLists()
    loadAgents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const loadAutomations = async (options: LoadAutomationsOptions = {}) => {
    if (!accessToken) return
    try {
      if (!options.silent && automations.length === 0) {
        setLoading(true)
      }
      setIsRefreshingAutomations(true)
      const response = await safeFetch(`${baseUrl}/automations`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setAutomationError('Tempo limite ao atualizar automações')
        return
      }

      if (!response.ok) {
        setAutomationError('Erro ao atualizar automações')
        return
      }

      const data = await response.json()
      persistAutomations(data.automations || [])
      setAutomationError(null)
    } catch (error) {
      console.error('Error loading automations:', error)
      setAutomationError('Erro ao carregar automações')
    } finally {
      if (!options.silent) {
        setLoading(false)
      }
      setIsRefreshingAutomations(false)
    }
  }

  const loadSavedLists = async () => {
    if (!accessToken) return
    try {
      if (savedLists.length === 0) setLoadingLists(true)
      const response = await safeFetch(`${baseUrl}/lists`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setListsError('Tempo limite ao carregar listas')
        return
      }

      if (!response.ok) {
        setListsError('Erro ao carregar listas')
        return
      }

      const data = await response.json()
      persistLists(data.lists || [])
      setListsError(null)
    } catch (error) {
      console.error('Error loading lists:', error)
      setListsError('Erro ao carregar listas')
    } finally {
      setLoadingLists(false)
    }
  }

  const loadAgents = async () => {
    if (!accessToken) return
    try {
      const response = await safeFetch(`${baseUrl}/agents`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setAgentsError('Tempo limite ao carregar agentes')
        return
      }

      if (!response.ok) {
        setAgentsError('Erro ao carregar agentes')
        return
      }

      const data = await response.json()
      persistAgents(data.agents || [])
      setAgentsError(null)
    } catch (error) {
      console.error('Error loading agents:', error)
      setAgentsError('Erro ao carregar agentes')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa'
      case 'paused': return 'Pausada'
      case 'draft': return 'Rascunho'
      default: return status
    }
  }

  const addAutomation = async () => {
    if (!automationName) {
      toast.error('Preencha o nome da automação')
      return
    }
    if (!selectedListId) {
      toast.error('Selecione uma lista')
      return
    }
    if (!selectedAgent) {
      toast.error('Selecione um agente')
      return
    }
    if (!firstMessage) {
      toast.error('Preencha a primeira mensagem')
      return
    }
    if (selectedChannels.length === 0) {
      toast.error('Selecione pelo menos um canal')
      return
    }

    try {
      const selectedList = savedLists.find(l => l.id === selectedListId)
      
      const response = await safeFetch(`${baseUrl}/automations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: automationName,
          description: automationDescription,
          selectedListId,
          selectedListName: selectedList?.name || '',
          selectedAgent,
          firstMessage,
          channels: selectedChannels,
          followUpEnabled,
          followUpDays,
          followUpMessage,
          status: 'draft'
        })
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        toast.error('Tempo limite ao criar automação')
        return
      }

      if (response.ok) {
        await loadAutomations({ silent: true })
        setShowNewAutomationDialog(false)
        resetForm()
        toast.success('Automação criada!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData?.message || 'Erro ao criar automação')
      }
    } catch (error) {
      console.error('Error creating automation:', error)
      toast.error('Erro ao criar automação')
    }
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta automação?')) return

    try {
      const response = await safeFetch(`${baseUrl}/automations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        toast.error('Tempo limite ao excluir automação')
        return
      }

      if (response.ok) {
        await loadAutomations({ silent: true })
        toast.success('Automação excluída!')
      } else {
        toast.error('Erro ao excluir automação')
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
      toast.error('Erro ao excluir automação')
    }
  }

  const toggleAutomationStatus = async (automation: Automation) => {
    const newStatus = automation.status === 'active' ? 'paused' : 'active'
    
    try {
      const response = await safeFetch(`${baseUrl}/automations/${automation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        toast.error('Tempo limite ao atualizar status')
        return
      }

      if (response.ok) {
        await loadAutomations({ silent: true })
        toast.success(`Automação ${newStatus === 'active' ? 'ativada' : 'pausada'}!`)
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Error updating automation status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    )
  }

  const insertVariable = (variable: string) => {
    setFirstMessage(prev => prev + `{{${variable}}}`)
  }

  const resetForm = () => {
    setAutomationName("")
    setAutomationDescription("")
    setSelectedListId("")
    setSelectedAgent("")
    setFirstMessage("")
    setSelectedChannels([])
    setFollowUpEnabled(true)
    setFollowUpDays(3)
    setFollowUpMessage("")
    setSelectedAutomation(null)
  }

  const totalExecutions = automations.reduce((sum, a) => sum + a.executionsTotal, 0)
  const totalLists = automations.reduce((sum, a) => sum + a.listsGenerated, 0)
  const totalCampaigns = automations.reduce((sum, a) => sum + a.campaignsSent, 0)

  const showStatusInfo = loading || isRefreshingAutomations || lastAutomationsSync || automationError

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            {showStatusInfo && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-1">
                {loading && !isRefreshingAutomations && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Preparando automações...
                  </span>
                )}
                {isRefreshingAutomations && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Atualizando automações...
                  </span>
                )}
                {lastAutomationsSync && (
                  <span>Última atualização: {lastAutomationsSync}</span>
                )}
                {automationError && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {automationError}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl">Automações</h1>
            <p className="text-muted-foreground">
              Fluxos automáticos completos de geração de leads até campanhas
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => loadAutomations({ silent: true })}
              disabled={isRefreshingAutomations}
              className="gap-2"
            >
              {isRefreshingAutomations ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Atualizando
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </>
              )}
            </Button>
            <Dialog open={showNewAutomationDialog} onOpenChange={setShowNewAutomationDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Automação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Automação</DialogTitle>
                <DialogDescription>
                  Configure um fluxo automático completo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Automação *</Label>
                    <Input
                      id="name"
                      value={automationName}
                      onChange={(e) => setAutomationName(e.target.value)}
                      placeholder="Ex: Automação Restaurantes SP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={automationDescription}
                      onChange={(e) => setAutomationDescription(e.target.value)}
                      placeholder="Descreva o objetivo desta automação..."
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Step 1: Select List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <List className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Etapa 1: Selecionar Lista</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="list">Escolha uma lista já gerada *</Label>
                    {loadingLists ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando listas...
                      </div>
                    ) : savedLists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma lista encontrada. Gere uma lista primeiro na página de Listas.
                      </p>
                    ) : (
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger id="list">
                          <SelectValue placeholder="Selecione uma lista" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} ({list.contactsCount} contatos)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {listsError && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {listsError}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Step 2: Select Agent */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                      <Bot className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Etapa 2: Selecionar Agente</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent">Escolha o agente de IA *</Label>
                    {agents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum agente encontrado. Crie um agente primeiro na página de Agentes.
                      </p>
                    ) : (
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger id="agent">
                          <SelectValue placeholder="Selecione um agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {agentsError && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {agentsError}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Step 3: First Message */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Etapa 3: Primeira Mensagem</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstMessage">Mensagem inicial *</Label>
                    <Textarea
                      id="firstMessage"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      placeholder="Olá {{nome}}, tudo bem? Vi que você tem um {{tipo_negocio}} em {{cidade}}..."
                      rows={4}
                    />
                    <div className="flex flex-wrap gap-2">
                      <p className="text-xs text-muted-foreground w-full">Variáveis disponíveis:</p>
                      {['nome', 'empresa', 'cidade', 'estado', 'tipo_negocio', 'telefone', 'email'].map((variable) => (
                        <Button
                          key={variable}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable)}
                          className="text-xs"
                        >
                          + {`{{${variable}}}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Step 4: Channels */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                      <Send className="w-4 h-4 text-orange-600" />
                    </div>
                    <h3 className="font-semibold">Etapa 4: Canais de Envio</h3>
                  </div>

                  <div className="space-y-2">
                    <Label>Selecione os canais *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {channelOptions.map((channel) => {
                        const Icon = channel.icon
                        const isSelected = selectedChannels.includes(channel.value)
                        
                        return (
                          <div
                            key={channel.value}
                            onClick={() => toggleChannel(channel.value)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-vai-blue-tech bg-vai-blue-light/20'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleChannel(channel.value)}
                            />
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-vai-blue-tech' : 'text-gray-500'}`} />
                            <span className="text-sm">{channel.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecionados: {selectedChannels.length} canal(is)
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Step 5: Follow-up */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold">Etapa 5: Follow-up</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="followup"
                      checked={followUpEnabled}
                      onCheckedChange={(checked) => setFollowUpEnabled(!!checked)}
                    />
                    <Label htmlFor="followup" className="cursor-pointer">
                      Enviar follow-up automático
                    </Label>
                  </div>

                  {followUpEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="followupDays">Aguardar quantos dias?</Label>
                        <Input
                          id="followupDays"
                          type="number"
                          value={followUpDays}
                          onChange={(e) => setFollowUpDays(Number(e.target.value))}
                          min="1"
                          max="30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="followupMessage">Mensagem de follow-up</Label>
                        <Textarea
                          id="followupMessage"
                          value={followUpMessage}
                          onChange={(e) => setFollowUpMessage(e.target.value)}
                          placeholder="Olá {{nome}}, estou retornando o contato..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAutomationDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={addAutomation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Automação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Automações</p>
                  <p className="text-2xl font-bold">{automations.length}</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Execuções</p>
                  <p className="text-2xl font-bold">{totalExecutions}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Listas Usadas</p>
                  <p className="text-2xl font-bold">{totalLists}</p>
                </div>
                <List className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campanhas Enviadas</p>
                  <p className="text-2xl font-bold text-green-600">{totalCampaigns}</p>
                </div>
                <Send className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automations List */}
        {automations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhuma automação criada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira automação para automatizar todo o processo de vendas
              </p>
              <Button onClick={() => setShowNewAutomationDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Automação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{automation.name}</CardTitle>
                        <Badge className={getStatusColor(automation.status)}>
                          {getStatusLabel(automation.status)}
                        </Badge>
                      </div>
                      <CardDescription>{automation.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAutomationStatus(automation)}
                      >
                        {automation.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAutomation(automation.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Flow Visualization */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      <List className="w-3 h-3" />
                      Lista: {automation.selectedListName}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1">
                      <Bot className="w-3 h-3" />
                      Agente
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1">
                      <Send className="w-3 h-3" />
                      {automation.channels?.join(', ')}
                    </Badge>
                    {automation.followUpEnabled && (
                      <>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" />
                          Follow-up ({automation.followUpDays}d)
                        </Badge>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Execuções</p>
                      <p className="font-bold text-lg">{automation.executionsTotal}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Listas</p>
                      <p className="font-bold text-lg">{automation.listsGenerated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Campanhas</p>
                      <p className="font-bold text-lg">{automation.campaignsSent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Respostas</p>
                      <p className="font-bold text-lg text-green-600">{automation.repliesProcessed}</p>
                    </div>
                  </div>

                  {automation.lastRun && (
                    <div className="text-xs text-muted-foreground">
                      Última execução: {formatDate(new Date(automation.lastRun))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)
}

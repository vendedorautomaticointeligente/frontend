import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { EmptyState } from "./EmptyState"
import { LoadingState } from "./LoadingState"
import { StatsCard } from "./StatsCard"
import { LeadDetailPage } from "./LeadDetailPage"
import { ProductsManager } from "./ProductsManager"
import { formatCurrency } from "../utils/formatters"
import { getApiUrl } from '../utils/apiConfig'
import { 
  Users, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building2,
  MapPin,
  DollarSign,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Star,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  UserPlus,
  Eye,
  TrendingUp,
  RefreshCw
} from "lucide-react"

const CRM_LEADS_CACHE_KEY = "crm_leads_cache"
const CRM_LEADS_META_KEY = "crm_leads_cache_meta"

// Helper function to calculate total value from lead products
const calculateLeadValue = (lead: any): number => {
  return lead.products?.reduce((sum: number, product: any) => sum + (parseFloat(product.price) || 0), 0) || 0
}

const getInitialLeads = (): Lead[] => {
  if (typeof window === "undefined") return []
  try {
    const cached = localStorage.getItem(CRM_LEADS_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch (error) {
    console.warn("Erro ao ler cache de leads", error)
    return []
  }
}

const getInitialLastSync = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    const metaRaw = localStorage.getItem(CRM_LEADS_META_KEY)
    if (!metaRaw) return null
    const meta = JSON.parse(metaRaw)
    return meta?.lastSync ? new Date(meta.lastSync).toLocaleTimeString() : null
  } catch (error) {
    console.warn("Erro ao ler meta de leads", error)
    return null
  }
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  city: string
  state: string
  segment: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  score: number
  value: number
  source: string
  lastContact: string
  notes: string
  products?: any[]
  created_at: string
}

export function CRMPage() {
  const { accessToken } = useAuth()
  const initialLeads = getInitialLeads()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [loading, setLoading] = useState(initialLeads.length === 0)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showProductsManager, setShowProductsManager] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(getInitialLastSync())
  const [lastError, setLastError] = useState<string | null>(null)

  const baseUrl = getApiUrl()

  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })
  
  // Helper function to format phone number for WhatsApp
  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // If doesn't start with country code, add Brazil's code (55)
    const withCountryCode = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
    
    return `https://wa.me/${withCountryCode}`
  }
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list')
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Form fields
  const [leadName, setLeadName] = useState("")
  const [leadCompany, setLeadCompany] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadCity, setLeadCity] = useState("")
  const [leadState, setLeadState] = useState("")
  const [leadSegment, setLeadSegment] = useState("")
  const [leadValue, setLeadValue] = useState<number>(0)
  const [leadSource, setLeadSource] = useState("")
  const [leadNotes, setLeadNotes] = useState("")

  const statusOptions = [
    { value: 'new', label: 'Novo', color: 'bg-gray-500', borderColor: 'border-gray-300', bgColor: 'bg-gray-50', icon: Star },
    { value: 'contacted', label: 'Contatado', color: 'bg-blue-500', borderColor: 'border-blue-300', bgColor: 'bg-blue-50', icon: Phone },
    { value: 'qualified', label: 'Qualificado', color: 'bg-purple-500', borderColor: 'border-purple-300', bgColor: 'bg-purple-50', icon: Target },
    { value: 'proposal', label: 'Proposta', color: 'bg-yellow-500', borderColor: 'border-yellow-300', bgColor: 'bg-yellow-50', icon: MessageSquare },
    { value: 'won', label: 'Ganho', color: 'bg-green-500', borderColor: 'border-green-300', bgColor: 'bg-green-50', icon: CheckCircle2 },
    { value: 'lost', label: 'Perdido', color: 'bg-red-500', borderColor: 'border-red-300', bgColor: 'bg-red-50', icon: AlertCircle }
  ]

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    loadLeads()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const persistLeads = (leadsList: Lead[]) => {
    setLeads(leadsList)
    try {
      localStorage.setItem(CRM_LEADS_CACHE_KEY, JSON.stringify(leadsList))
      const now = new Date()
      localStorage.setItem(CRM_LEADS_META_KEY, JSON.stringify({ lastSync: now.toISOString() }))
      setLastSync(now.toLocaleTimeString())
    } catch (cacheError) {
      console.warn('Erro ao salvar cache/meta de leads', cacheError)
    }
  }

  type LoadLeadsOptions = {
    silent?: boolean
  }

  const loadLeads = async (options: LoadLeadsOptions = {}) => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    try {
      if (!options.silent && leads.length === 0) {
        setLoading(true)
      }
      setIsRefreshing(true)
      const response = await safeFetch(`${baseUrl}/crm/leads`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastError('Tempo limite ao atualizar leads')
        return
      }

      if (!response.ok) {
        setLastError('Erro ao carregar leads')
        return
      }

      const data = await response.json()
      const leadsList = data.leads || []
      persistLeads(leadsList)
      setLastError(null)
    } catch (error) {
      console.error('Error loading leads:', error)
      setLastError('Erro ao carregar leads')
    } finally {
      if (!options.silent) {
        setLoading(false)
      }
      setIsRefreshing(false)
    }
  }

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0]
  }

  const filterLeadsBySearch = (leadsToFilter: Lead[]) => {
    if (!searchTerm) return leadsToFilter
    
    return leadsToFilter.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm)
    )
  }

  const filteredLeads = filterLeadsBySearch(leads)

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status)
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await safeFetch(`${baseUrl}/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({
          status: newStatus,
          lastContact: new Date().toISOString()
        })
      })

      if (response && response.ok) {
        await loadLeads()
        toast.success('Status atualizado!')
      } else if (!response) {
        setLastError('Tempo limite ao atualizar status')
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const response = await safeFetch(`${baseUrl}/crm/leads/${leadId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (response && response.ok) {
        await loadLeads()
        toast.success('Lead excluído!')
      } else if (!response) {
        setLastError('Tempo limite ao excluir lead')
      } else {
        toast.error('Erro ao excluir lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Erro ao excluir lead')
    }
  }

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setLeadName(lead.name)
    setLeadCompany(lead.company)
    setLeadEmail(lead.email)
    setLeadPhone(lead.phone)
    setLeadCity(lead.city)
    setLeadState(lead.state)
    setLeadSegment(lead.segment)
    setLeadValue(calculateLeadValue(lead))
    setLeadSource(lead.source)
    setLeadNotes(lead.notes)
    setShowEditDialog(true)
  }

  const updateLead = async () => {
    if (!selectedLead) return

    try {
      const response = await safeFetch(`${baseUrl}/crm/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({
          name: leadName,
          company: leadCompany,
          email: leadEmail,
          phone: leadPhone,
          city: leadCity,
          state: leadState,
          segment: leadSegment,
          value: leadValue,
          source: leadSource,
          notes: leadNotes
        })
      })

      if (response.ok) {
        await loadLeads()
        setShowEditDialog(false)
        resetForm()
        toast.success('Lead atualizado!')
      } else {
        toast.error('Erro ao atualizar lead')
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Erro ao atualizar lead')
    }
  }

  const addLead = async () => {
    if (!leadName || !leadCompany || !leadEmail) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const response = await safeFetch(`${baseUrl}/crm/leads`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          name: leadName,
          company: leadCompany,
          email: leadEmail,
          phone: leadPhone,
          city: leadCity,
          state: leadState,
          segment: leadSegment,
          value: leadValue,
          source: leadSource,
          notes: leadNotes,
          status: 'new',
          score: 0,
          lastContact: new Date().toISOString()
        })
      })

      if (response.ok) {
        await loadLeads()
        setShowAddLeadDialog(false)
        resetForm()
        toast.success('Lead criado!')
      } else {
        toast.error('Erro ao criar lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Erro ao criar lead')
    }
  }

  const resetForm = () => {
    setLeadName("")
    setLeadCompany("")
    setLeadEmail("")
    setLeadPhone("")
    setLeadCity("")
    setLeadState("")
    setLeadSegment("")
    setLeadValue(0)
    setLeadSource("")
    setLeadNotes("")
    setSelectedLead(null)
  }

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Se um lead foi selecionado, mostrar a página de detalhe
  if (selectedLeadId) {
    return (
      <LeadDetailPage 
        leadId={selectedLeadId} 
        onBack={() => {
          setSelectedLeadId(null)
          loadLeads() // Recarregar leads quando voltar
        }} 
      />
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl">CRM</h1>
            <p className="text-muted-foreground">
              Gerencie seus leads e oportunidades
            </p>
            <div className="text-xs text-muted-foreground mt-1 space-x-2">
              {lastSync && <span>Última atualização: {lastSync}</span>}
              {lastError && <span className="text-amber-600">{lastError}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowProductsManager(true)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Produtos/Serviços
            </Button>
            
            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadLeads({ silent: true })}
              disabled={isRefreshing}
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Dialog open={showAddLeadDialog} onOpenChange={setShowAddLeadDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Lead</DialogTitle>
                  <DialogDescription>
                    Preencha as informações do lead
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Nome do contato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa *</Label>
                    <Input
                      id="company"
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={leadCity}
                      onChange={(e) => setLeadCity(e.target.value)}
                      placeholder="São Paulo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={leadState}
                      onChange={(e) => setLeadState(e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento</Label>
                    <Input
                      id="segment"
                      value={leadSegment}
                      onChange={(e) => setLeadSegment(e.target.value)}
                      placeholder="Tecnologia, Varejo, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="value">Valor Estimado (R$)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={leadValue}
                      onChange={(e) => setLeadValue(Number(e.target.value))}
                      placeholder="10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Origem</Label>
                    <Select value={leadSource} onValueChange={setLeadSource}>
                      <SelectTrigger id="source">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                        <SelectItem value="email">Email Marketing</SelectItem>
                        <SelectItem value="evento">Evento</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={leadNotes}
                      onChange={(e) => setLeadNotes(e.target.value)}
                      placeholder="Adicione observações sobre este lead..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddLeadDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addLead}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Lead
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Pipeline Box */}
        {(() => {
          const openLeads = filteredLeads.filter(l => !['won', 'lost'].includes(l.status))
          const totalValue = openLeads.reduce((sum, lead) => sum + calculateLeadValue(lead), 0)
          
          return (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Pipeline Aberto</p>
                    <p className="text-4xl font-bold text-blue-600 mt-1">
                      {formatCurrency(totalValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{openLeads.length} oportunidade{openLeads.length !== 1 ? 's' : ''}</p>
                  </div>
                  <TrendingUp className="w-16 h-16 text-blue-400 opacity-20" />
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statusOptions.map((status) => {
            const count = getLeadsByStatus(status.value).length
            const StatusIcon = status.icon
            
            return (
              <Card key={status.value} className={`${status.bgColor} border-2 ${status.borderColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{status.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <StatusIcon className={`w-8 h-8 text-${status.color.replace('bg-', '')}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {statusOptions.map((status) => {
              const statusLeads = getLeadsByStatus(status.value)
              const StatusIcon = status.icon

              return (
                <div key={status.value} className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${status.bgColor} border-2 ${status.borderColor}`}>
                    <StatusIcon className="w-5 h-5" />
                    <h3 className="font-semibold">{status.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {statusLeads.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 min-h-[200px]">
                    {statusLeads.map((lead) => (
                      <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{lead.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {lead.company}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="h-7 w-7 p-0 text-vai-blue-tech hover:text-vai-blue-tech"
                                title="Ver detalhes"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteLead(lead.id)}
                                className="h-7 w-7 p-0 text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            {lead.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                <a 
                                  href={formatPhoneForWhatsApp(lead.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-vai-green-ai hover:underline"
                                  title="Abrir no WhatsApp"
                                >
                                  {lead.phone}
                                </a>
                              </div>
                            )}
                            {(() => {
                              const productsValue = calculateLeadValue(lead)
                              return productsValue > 0 && (
                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                  <DollarSign className="w-3 h-3" />
                                  <span>{formatCurrency(productsValue)}</span>
                                </div>
                              )
                            })()}
                            {lead.products && lead.products.length > 0 && (
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <Target className="w-3 h-3 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {lead.products.slice(0, 2).map((product: any) => (
                                    <Badge key={product.id} variant="outline" className="text-xs px-1 py-0">
                                      {product.name}
                                    </Badge>
                                  ))}
                                  {lead.products.length > 2 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      +{lead.products.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {status.value !== 'new' && status.value !== 'won' && status.value !== 'lost' && (
                            <Select
                              value={lead.status}
                              onValueChange={(newStatus) => updateLeadStatus(lead.id, newStatus)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Empresa</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Telefone</th>
                      <th className="text-left p-3 font-medium">Produtos</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Valor</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-muted-foreground">
                          Nenhum lead encontrado. Adicione um novo lead para começar.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const statusInfo = getStatusInfo(lead.status)
                        return (
                          <tr key={lead.id} className="border-t hover:bg-muted/50">
                            <td className="p-3">{lead.name}</td>
                            <td className="p-3">{lead.company}</td>
                            <td className="p-3 text-sm text-muted-foreground">{lead.email}</td>
                            <td className="p-3 text-sm">
                              {lead.phone ? (
                                <a 
                                  href={formatPhoneForWhatsApp(lead.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-vai-green-ai hover:underline"
                                  title="Abrir no WhatsApp"
                                >
                                  {lead.phone}
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {lead.products && lead.products.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {lead.products.slice(0, 2).map((product: any) => (
                                    <Badge key={product.id} variant="outline" className="text-xs">
                                      {product.name}
                                    </Badge>
                                  ))}
                                  {lead.products.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{lead.products.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="p-3 font-medium text-green-600">
                              {(() => {
                                const productsValue = calculateLeadValue(lead)
                                return productsValue > 0 ? formatCurrency(productsValue) : '-'
                              })()}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLeadId(lead.id)}
                                  title="Ver detalhes"
                                  className="text-vai-blue-tech hover:text-vai-blue-tech"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLeadId(lead.id)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteLead(lead.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Lead</DialogTitle>
              <DialogDescription>
                Atualize as informações do lead
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Empresa</Label>
                <Input
                  id="edit-company"
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">Cidade</Label>
                <Input
                  id="edit-city"
                  value={leadCity}
                  onChange={(e) => setLeadCity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-state">Estado</Label>
                <Input
                  id="edit-state"
                  value={leadState}
                  onChange={(e) => setLeadState(e.target.value)}
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-segment">Segmento</Label>
                <Input
                  id="edit-segment"
                  value={leadSegment}
                  onChange={(e) => setLeadSegment(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-value">Valor Estimado (R$)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  value={leadValue}
                  onChange={(e) => setLeadValue(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea
                  id="edit-notes"
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={updateLead}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Products Manager */}
        <ProductsManager 
          isOpen={showProductsManager} 
          onClose={() => setShowProductsManager(false)}
          onProductAdded={() => {
            // Opcional: recarregar algo quando produto é adicionado
          }}
        />
      </div>
    </div>
  )
}

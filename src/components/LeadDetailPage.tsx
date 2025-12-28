import { useState, useEffect } from "react"
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Circle,
  Trash2,
  MessageSquare,
  Clock,
  Phone,
  Mail,
  Building2,
  MapPin,
  Tag,
  Edit2,
  X
} from "lucide-react"
import { Input } from "./ui/input"
import { formatCurrency, formatDate } from "../utils/formatters"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { toast } from "sonner"
import { useAuth } from "../hooks/useAuthLaravel"
import { getApiUrl } from '../utils/apiConfig'

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

type Task = {
  id: string
  title: string
  description: string
  dueDate: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

type Schedule = {
  id: string
  title: string
  description: string
  dateTime: string
  type: 'call' | 'meeting' | 'email' | 'whatsapp' | 'followup'
  completed: boolean
}

type Note = {
  id: string
  text: string
  timestamp: string
}

type Lead = {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  city?: string
  state?: string
  segment?: string
  status: LeadStatus
  score: number
  value: number
  source?: string
  lastContact?: string
  notes?: string
  product_id?: number | null
  products?: any[]
  recurrence?: 'unique' | 'recurring' | null
  created_at: string
  updated_at: string
}

const statusConfig: Record<LeadStatus, { color: string; label: string; bgColor: string }> = {
  new: { color: 'text-gray-600', label: 'Novo', bgColor: 'bg-gray-100' },
  contacted: { color: 'text-blue-600', label: 'Contatado', bgColor: 'bg-blue-100' },
  qualified: { color: 'text-purple-600', label: 'Qualificado', bgColor: 'bg-purple-100' },
  proposal: { color: 'text-orange-600', label: 'Proposta', bgColor: 'bg-orange-100' },
  won: { color: 'text-green-600', label: 'Ganho', bgColor: 'bg-green-100' },
  lost: { color: 'text-red-600', label: 'Perdido', bgColor: 'bg-red-100' }
}

interface LeadDetailPageProps {
  leadId: string
  onBack: () => void
}

export function LeadDetailPage({ leadId, onBack }: LeadDetailPageProps) {
  const { accessToken } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<Partial<Lead>>({})
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  
  // Modal states
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewSchedule, setShowNewSchedule] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newTaskData, setNewTaskData] = useState({ title: '', description: '', dueDate: '', priority: 'medium' as const })
  const [newScheduleData, setNewScheduleData] = useState({ title: '', description: '', dateTime: '', type: 'call' as const })
  const [newProductData, setNewProductData] = useState({ name: '', recurrence: 'unique' as 'unique' | 'recurring', price: '', observations: '' })
  const [newNote, setNewNote] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  const baseUrl = getApiUrl()

  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  // Load lead data
  useEffect(() => {
    const loadLead = async () => {
      try {
        const response = await fetch(`${baseUrl}/crm/leads`, {
          headers: getHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          const allLeads = data.leads
          const foundLead = allLeads.find((l: Lead) => l.id === leadId)
          
          if (foundLead) {
            setLead(foundLead)
            setFormData(foundLead)
            // Carregar os produtos selecionados
            if (foundLead.products && Array.isArray(foundLead.products)) {
              setSelectedProducts(foundLead.products.map((p: any) => p.id))
            }
          }
        }
      } catch (error) {
        toast.error('Erro ao carregar lead')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadLead()
  }, [leadId])

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${baseUrl}/products`, {
          headers: getHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Produtos carregados:', data.products)
          setProducts(data.products)
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
      }
    }

    loadProducts()
  }, [])

  const handleFormChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => {
      const newSelection = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
      
      // Recalcular o valor total com os produtos selecionados
      const selectedProductsData = products.filter(p => newSelection.includes(p.id))
      const totalValue = selectedProductsData.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0)
      
      // Debug: log para verificar o cálculo
      console.log('Produtos selecionados:', selectedProductsData)
      console.log('Valor total calculado:', totalValue)
      
      // Arredondar para 2 casas decimais para evitar erros de precisão
      const roundedValue = Math.round(totalValue * 100) / 100
      
      handleFormChange('value', roundedValue)
      return newSelection
    })
  }

  const handleProductChange = (productId: string | number | null) => {
    if (!productId) {
      handleFormChange('product_id', null)
      return
    }

    // Encontrar o produto selecionado e preencher o valor
    const selectedProduct = products.find(p => p.id === productId)
    if (selectedProduct) {
      handleFormChange('product_id', selectedProduct.id)
      handleFormChange('value', selectedProduct.price)
    }
  }

  const handleSaveLead = async () => {
    if (!lead) return
    
    setSaving(true)
    try {
      // 1. Salvar os dados do lead no backend
      const response = await fetch(`${baseUrl}/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar lead')
      }

      // 2. Vincular os produtos selecionados
      if (selectedProducts.length > 0) {
        const productsResponse = await fetch(`${baseUrl}/crm/leads/${lead.id}/products`, {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({ product_ids: selectedProducts })
        })

        if (!productsResponse.ok) {
          throw new Error('Erro ao vincular produtos')
        }
      }

      // 3. Recarregar os dados do lead do backend para garantir consistência
      const refreshResponse = await fetch(`${baseUrl}/crm/leads`, {
        headers: getHeaders()
      })

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        const updatedLead = data.leads.find((l: Lead) => l.id === leadId)
        
        if (updatedLead) {
          setLead(updatedLead)
          setFormData(updatedLead)
          // Atualizar os produtos selecionados também
          if (updatedLead.products && Array.isArray(updatedLead.products)) {
            setSelectedProducts(updatedLead.products.map((p: any) => p.id))
          }
        }
      }

      toast.success('Lead atualizado com sucesso')
    } catch (error) {
      toast.error('Erro ao salvar lead')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    const note: Note = {
      id: Date.now().toString(),
      text: newNote,
      timestamp: formatDate(new Date())
    }
    
    setNotes(prev => [note, ...prev])
    setNewNote('')
    toast.success('Observação adicionada')
  }

  const handleAddTask = () => {
    if (!newTaskData.title.trim() || !newTaskData.dueDate) {
      toast.error('Preencha título e data')
      return
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTaskData.title,
      description: newTaskData.description,
      dueDate: newTaskData.dueDate,
      completed: false,
      priority: newTaskData.priority
    }

    setTasks(prev => [...prev, task])
    setNewTaskData({ title: '', description: '', dueDate: '', priority: 'medium' })
    setShowNewTask(false)
    toast.success('Tarefa criada')
  }

  const handleAddSchedule = () => {
    if (!newScheduleData.title.trim() || !newScheduleData.dateTime) {
      toast.error('Preencha título e data/hora')
      return
    }

    const schedule: Schedule = {
      id: Date.now().toString(),
      title: newScheduleData.title,
      description: newScheduleData.description,
      dateTime: newScheduleData.dateTime,
      type: newScheduleData.type,
      completed: false
    }

    setSchedules(prev => [...prev, schedule])
    setNewScheduleData({ title: '', description: '', dateTime: '', type: 'call' })
    setShowNewSchedule(false)
    toast.success('Agendamento criado')
  }

  const handleAddProduct = async () => {
    if (!newProductData.name.trim() || !newProductData.price) {
      toast.error('Preencha nome e preço do produto')
      return
    }

    setSavingProduct(true)
    try {
      const response = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          name: newProductData.name.trim(),
          recurrence: newProductData.recurrence,
          price: parseFloat(newProductData.price),
          observations: newProductData.observations.trim() || null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Adicionar o novo produto à lista
        setProducts(prev => [data.product, ...prev])
        // Selecionar automaticamente o novo produto e recalcular valor
        handleProductToggle(data.product.id)
        // Limpar o formulário
        setNewProductData({ name: '', recurrence: 'unique', price: '', observations: '' })
        setShowNewProduct(false)
        toast.success('Produto cadastrado com sucesso!')
      } else {
        toast.error('Erro ao cadastrar produto')
      }
    } catch (error) {
      toast.error('Erro ao cadastrar produto')
      console.error(error)
    } finally {
      setSavingProduct(false)
    }
  }

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ))
  }

  const toggleScheduleComplete = (scheduleId: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId ? { ...schedule, completed: !schedule.completed } : schedule
    ))
  }

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
    toast.success('Tarefa removida')
  }

  const deleteSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId))
    toast.success('Agendamento removido')
  }

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId))
    toast.success('Observação removida')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vai-blue-tech border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-vai-text-secondary">Carregando lead...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-vai-text-secondary mb-4">Lead não encontrado</p>
          <Button onClick={onBack} variant="outline">Voltar</Button>
        </div>
      </div>
    )
  }

  const statusKey = formData.status as LeadStatus || 'new'
  const statusInfo = statusConfig[statusKey]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-vai-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-vai-text-primary">{lead.name}</h1>
            <p className="text-sm text-vai-text-secondary">{lead.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSaveLead}
            disabled={saving}
            className="gap-2 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button onClick={onBack} variant="outline">
            Fechar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
          {/* Left Column - Lead Info */}
          <div className="col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-vai-text-primary mb-4">Informações do Lead</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Nome *
                  </label>
                  <Input 
                    value={formData.name || ''} 
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Empresa
                  </label>
                  <Input 
                    value={formData.company || ''} 
                    onChange={(e) => handleFormChange('company', e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <Input 
                    value={formData.email || ''} 
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </label>
                  <Input 
                    value={formData.phone || ''} 
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Cidade
                  </label>
                  <Input 
                    value={formData.city || ''} 
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2">Estado</label>
                  <Input 
                    value={formData.state || ''} 
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Segmento
                  </label>
                  <Input 
                    value={formData.segment || ''} 
                    onChange={(e) => handleFormChange('segment', e.target.value)}
                    placeholder="Tecnologia, Varejo, etc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2">Status</label>
                  <select 
                    value={formData.status || 'new'}
                    onChange={(e) => handleFormChange('status', e.target.value as LeadStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20 focus:border-vai-blue-tech"
                  >
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Scoring Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-vai-text-primary mb-4">Pontuação e Valor</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2">Score</label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number"
                      value={formData.score || 0} 
                      onChange={(e) => handleFormChange('score', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="flex-1"
                    />
                    <span className="text-sm text-vai-text-secondary">/100</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-vai-blue-tech h-2 rounded-full transition-all"
                      style={{ width: `${formData.score || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2">Valor Estimado</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-vai-text-primary font-medium">
                    {formatCurrency(formData.value || 0)}
                  </div>
                  <p className="text-xs text-vai-text-secondary mt-1">Soma dos produtos selecionados</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2 flex items-center justify-between">
                    <span>Produtos/Serviços</span>
                    <Button
                      onClick={() => setShowNewProduct(true)}
                      size="sm"
                      className="gap-2 bg-vai-blue-tech hover:bg-vai-blue-tech/90 text-white"
                      title="Cadastrar novo produto"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Produto
                    </Button>
                  </label>
                  {products.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                      <div className={`${products.length > 5 ? 'max-h-80 overflow-y-auto' : ''} p-3`}>
                        {products.sort((a, b) => a.name.localeCompare(b.name)).map((product) => (
                          <label key={product.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleProductToggle(product.id)}
                              className="w-4 h-4 text-vai-blue-tech rounded focus:ring-2 focus:ring-vai-blue-tech/20 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-vai-text-primary truncate">{product.name}</div>
                              <div className="text-xs text-vai-text-secondary">
                                {formatCurrency(product.price)} • {product.recurrence === 'unique' ? 'Único' : 'Recorrente'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <p className="text-sm text-vai-text-secondary mb-2">Nenhum produto cadastrado</p>
                      <Button
                        onClick={() => setShowNewProduct(true)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Produto
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-vai-text-secondary mb-2">Recorrência</label>
                  <select 
                    value={formData.recurrence || ''}
                    onChange={(e) => handleFormChange('recurrence', e.target.value as 'unique' | 'recurring' | null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20 focus:border-vai-blue-tech"
                  >
                    <option value="">Selecionar tipo...</option>
                    <option value="unique">Único</option>
                    <option value="recurring">Recorrente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-vai-text-primary">Tarefas</h2>
                <Button 
                  onClick={() => setShowNewTask(true)}
                  size="sm"
                  className="gap-2 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
                >
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </div>

              {showNewTask && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="space-y-3 mb-3">
                    <Input 
                      placeholder="Título da tarefa"
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea 
                      placeholder="Descrição (opcional)"
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        type="date"
                        value={newTaskData.dueDate}
                        onChange={(e) => setNewTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                      <select 
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20"
                      >
                        <option value="low">Baixa Prioridade</option>
                        <option value="medium">Média Prioridade</option>
                        <option value="high">Alta Prioridade</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddTask}
                      size="sm"
                      className="bg-vai-blue-tech hover:bg-vai-blue-tech/90"
                    >
                      Criar Tarefa
                    </Button>
                    <Button 
                      onClick={() => setShowNewTask(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-vai-text-secondary text-center py-4">Nenhuma tarefa adicionada</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-vai-text-primary'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-vai-text-secondary">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              task.priority === 'high' ? 'bg-red-50 text-red-700' :
                              task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Schedules Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-vai-text-primary">Agendamentos</h2>
                <Button 
                  onClick={() => setShowNewSchedule(true)}
                  size="sm"
                  className="gap-2 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
                >
                  <Plus className="w-4 h-4" />
                  Novo Agendamento
                </Button>
              </div>

              {showNewSchedule && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <div className="space-y-3 mb-3">
                    <Input 
                      placeholder="Título do agendamento"
                      value={newScheduleData.title}
                      onChange={(e) => setNewScheduleData(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea 
                      placeholder="Descrição (opcional)"
                      value={newScheduleData.description}
                      onChange={(e) => setNewScheduleData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        type="datetime-local"
                        value={newScheduleData.dateTime}
                        onChange={(e) => setNewScheduleData(prev => ({ ...prev, dateTime: e.target.value }))}
                      />
                      <select 
                        value={newScheduleData.type}
                        onChange={(e) => setNewScheduleData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20"
                      >
                        <option value="call">Telefonema</option>
                        <option value="meeting">Reunião</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="followup">Acompanhamento</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddSchedule}
                      size="sm"
                      className="bg-vai-blue-tech hover:bg-vai-blue-tech/90"
                    >
                      Agendar
                    </Button>
                    <Button 
                      onClick={() => setShowNewSchedule(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {schedules.length === 0 ? (
                  <p className="text-sm text-vai-text-secondary text-center py-4">Nenhum agendamento</p>
                ) : (
                  schedules.map(schedule => (
                    <div key={schedule.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <button
                        onClick={() => toggleScheduleComplete(schedule.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {schedule.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-vai-blue-tech" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${schedule.completed ? 'line-through text-gray-500' : 'text-vai-text-primary'}`}>
                          {schedule.title}
                        </p>
                        {schedule.description && (
                          <p className="text-sm text-vai-text-secondary">{schedule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDate(new Date(schedule.dateTime))}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-vai-blue-light text-vai-blue-tech">
                            {schedule.type === 'call' ? '📞 Telefonema' :
                             schedule.type === 'meeting' ? '👥 Reunião' :
                             schedule.type === 'email' ? '📧 Email' :
                             schedule.type === 'whatsapp' ? '💬 WhatsApp' :
                             '📋 Acompanhamento'}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Notes & Timeline */}
          <div className="space-y-6">
            {/* Notes Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-vai-blue-tech" />
                <h2 className="text-lg font-semibold text-vai-text-primary">Observações</h2>
              </div>

              <div className="mb-4">
                <textarea 
                  placeholder="Adicione uma observação..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vai-blue-tech/20"
                  rows={3}
                />
                <Button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="w-full mt-2 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
                >
                  Adicionar Observação
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-vai-text-secondary text-center py-4">Nenhuma observação adicionada</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition group">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs text-vai-text-secondary">{note.timestamp}</span>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm text-vai-text-primary whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Novo Produto */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Cadastrar Novo Produto</h2>
              <button
                onClick={() => setShowNewProduct(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto/Serviço *
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Consultoria Web"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recorrência *
                </label>
                <select
                  value={newProductData.recurrence}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, recurrence: e.target.value as 'unique' | 'recurring' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unique">Único</option>
                  <option value="recurring">Recorrente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={newProductData.price}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  placeholder="Detalhes do produto..."
                  value={newProductData.observations}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, observations: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-end gap-3">
              <Button
                onClick={() => setShowNewProduct(false)}
                variant="outline"
                className="text-gray-700"
                disabled={savingProduct}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddProduct}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={savingProduct}
              >
                {savingProduct ? 'Cadastrando...' : 'Cadastrar Produto'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

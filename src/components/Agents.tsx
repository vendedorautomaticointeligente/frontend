import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card"
import { Button as BaseButton } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { safeFetch, FETCH_DEFAULT_TIMEOUT } from "../utils/fetchWithTimeout"
import { readJsonCache, writeJsonCache } from "../utils/localCache"
import { getApiUrl } from '../utils/apiConfig'
import {
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Sparkles,
  Copy,
  Eye,
  RefreshCw,
  Loader2,
  X,
  ChevronDown,
  AlertCircle
} from "lucide-react"

const AGENTS_CACHE_KEY = "agents_cache"
const AGENTS_META_CACHE_KEY = "agents_cache_meta"
const INSTANCES_CACHE_KEY = "agents_instances_cache"
const INSTANCES_META_CACHE_KEY = "agents_instances_cache_meta"

type LoadAgentsOptions = {
  silent?: boolean
}

// Type assertion for Button with variant and size props
const Button = BaseButton as any

interface Plan {
  name: string
  includes: string
  limits: string
  price: string
  extras?: string
}

interface AgentFormData {
  // 0. NOME DO AGENTE (interno)
  nome_agente_pnh: string
  conexao_whatsapp: string

  // 1. QUEM ATENDE
  agente_nome: string
  agente_funcao: string
  agente_jeito_falar: string
  agente_nao_fazer: string

  // 2. SOBRE A EMPRESA
  empresa_nome: string
  empresa_o_que_faz: string
  empresa_diferenciais: string
  empresa_nao_faz: string

  // 3. PRODUTO/SERVIÇO
  produto_o_que_e: string
  produto_funcionalidades: string
  produto_beneficios: string
  produto_publico: string

  // 4. PLANOS E PREÇOS
  planos: Plan[]
  planos_teste_gratis: string
  planos_pagamento: string
  planos_reembolso: string
  planos_links: string

  // 5. COMO FUNCIONA
  atendimento_objetivo: string
  atendimento_conducao: string
  atendimento_frases_sugeridas: string
  atendimento_evitar: string
  atendimento_resposta_padrao_fora_escopo: string

  // 6. INFORMAÇÕES ADICIONAIS
  informacoes_adicionais: string
}

interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  usageCount: number
  createdAt: string
  data: AgentFormData
}

// 📊 Tipos para as novas respostas melhoradas do backend
interface PromptPreview {
  preview: string
  total_lines: number
  total_chars: number
  total_words: number
}

interface PromptInfo {
  hash: string
  preview: PromptPreview
  generated_at?: string
  updated_at?: string
  regenerated?: boolean
}

interface ValidationInfo {
  persisted: boolean
  prompt_generated: boolean
  data_complete?: boolean
  associations_correct?: boolean
  data_intact?: boolean
  timestamp: string
}

interface FieldChange {
  old_value: string | number
  new_value: string | number
  changed_at: string
}

interface ChangesInfo {
  fields_modified: Record<string, FieldChange | { old_count: number, new_count: number, changed_at: string }>
  fields_modified_count: number
  prompt_changed: boolean
  previous_prompt_hash?: string
  current_prompt_hash?: string
}

interface AgentResponse {
  success: boolean
  message: string
  agent: Agent
  validation: ValidationInfo
  changes?: ChangesInfo
  prompt_info: PromptInfo
}

interface PromptStatistics {
  total_lines: number
  total_chars: number
  total_words: number
  generated_at: string
  prompt_hash: string
}

interface PromptViewResponse {
  success: boolean
  agent_id: number
  agent_name: string
  prompt: string
  statistics: PromptStatistics
}

export function Agents() {
  const { accessToken } = useAuth()
  const initialAgents = readJsonCache<Agent[]>(AGENTS_CACHE_KEY) ?? []
  const initialInstances = readJsonCache<any[]>(INSTANCES_CACHE_KEY) ?? []
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [instances, setInstances] = useState<any[]>(initialInstances)
  const [loading, setLoading] = useState(initialAgents.length === 0 && initialInstances.length === 0)
  const [creatingNewAgent, setCreatingNewAgent] = useState(false)
  const [editingAgent, setEditingAgent] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [lastInstancesSync, setLastInstancesSync] = useState<string | null>(() => {
    const cachedMeta = readJsonCache<{ lastSync?: string }>(INSTANCES_META_CACHE_KEY)
    return cachedMeta?.lastSync ? new Date(cachedMeta.lastSync).toLocaleTimeString() : null
  })
  const [lastAgentsSync, setLastAgentsSync] = useState<string | null>(() => {
    const cachedMeta = readJsonCache<{ lastSync?: string }>(AGENTS_META_CACHE_KEY)
    return cachedMeta?.lastSync ? new Date(cachedMeta.lastSync).toLocaleTimeString() : null
  })
  const [lastAgentsError, setLastAgentsError] = useState<string | null>(null)
  const [lastInstancesError, setLastInstancesError] = useState<string | null>(null)
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false)
  const [isRefreshingInstances, setIsRefreshingInstances] = useState(false)


  const baseUrl = getApiUrl()

  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  const persistAgents = (agentsList: Agent[]) => {
    setAgents(agentsList)
    writeJsonCache(AGENTS_CACHE_KEY, agentsList)
    const now = new Date()
    writeJsonCache(AGENTS_META_CACHE_KEY, { lastSync: now.toISOString() })
    setLastAgentsSync(now.toLocaleTimeString())
  }

  const persistInstances = (instancesList: any[]) => {
    setInstances(instancesList)
    writeJsonCache(INSTANCES_CACHE_KEY, instancesList)
    const now = new Date()
    writeJsonCache(INSTANCES_META_CACHE_KEY, { lastSync: now.toISOString() })
    setLastInstancesSync(now.toLocaleTimeString())
  }

  const assignAgentInstance = async (agentId: string, instanceName: string) => {
    try {
      const response = await safeFetch(
        `${baseUrl}/agents/${agentId}/assign-instance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            instance_name: instanceName
          })
        },
        { timeout: FETCH_DEFAULT_TIMEOUT }
      )

      if (!response) {
        setLastAgentsError('Tempo limite ao vincular agente ao WhatsApp')
        return false
      }

      if (!response.ok) {
        console.warn('Erro ao vincular agente à instância', await response.text().catch(() => response.status))
        setLastAgentsError('Erro ao vincular agente ao WhatsApp')
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao vincular agente:', error)
      setLastAgentsError('Erro ao vincular agente ao WhatsApp')
      return false
    }
  }

  const emptyFormData: AgentFormData = {
    nome_agente_pnh: "",
    conexao_whatsapp: "",
    agente_nome: "",
    agente_funcao: "",
    agente_jeito_falar: "",
    agente_nao_fazer: "",
    empresa_nome: "",
    empresa_o_que_faz: "",
    empresa_diferenciais: "",
    empresa_nao_faz: "",
    produto_o_que_e: "",
    produto_funcionalidades: "",
    produto_beneficios: "",
    produto_publico: "",
    planos: [{ name: "", includes: "", limits: "", price: "" }],
    planos_teste_gratis: "",
    planos_pagamento: "",
    planos_reembolso: "",
    planos_links: "",
    atendimento_objetivo: "",
    atendimento_conducao: "",
    atendimento_frases_sugeridas: "",
    atendimento_evitar: "",
    atendimento_resposta_padrao_fora_escopo: "",
    informacoes_adicionais: ""
  }

  const [formData, setFormData] = useState<AgentFormData>(emptyFormData)
  const [expandedSections, setExpandedSections] = useState({
    nome_agente: true,
    quem_atende: true,
    sobre_empresa: false,
    sobre_produto: false,
    planos_precos: false,
    como_funciona: false,
    informacoes_adicionais: false
  })

  const loadAgentsAndInstances = async (options: LoadAgentsOptions = {}) => {
    if (!accessToken) return
    setIsRefreshingAgents(true)
    setIsRefreshingInstances(true)

    try {
      const [agentsResponse, instancesResponse] = await Promise.allSettled([
        safeFetch(`${baseUrl}/agents`, { headers: getHeaders() }, { timeout: FETCH_DEFAULT_TIMEOUT }),
        safeFetch(`${baseUrl}/whatsapp/connections`, { headers: getHeaders() }, { timeout: FETCH_DEFAULT_TIMEOUT })
      ])

      const handleAgentsResult = async () => {
        if (agentsResponse.status === 'fulfilled') {
          const response = agentsResponse.value
          if (!response) {
            setLastAgentsError('Tempo limite ao atualizar agentes')
            return
          }
          if (!response.ok) {
            console.error('Erro ao atualizar agentes:', await response.text().catch(() => response.status))
            setLastAgentsError('Erro ao atualizar agentes')
            return
          }
          const data = await response.json()
          persistAgents(data.agents || [])
          setLastAgentsError(null)
        } else {
          console.error('Erro ao sincronizar agentes:', agentsResponse.reason)
          setLastAgentsError('Erro ao atualizar agentes')
        }
      }

      const handleInstancesResult = async () => {
        if (instancesResponse.status === 'fulfilled') {
          const response = instancesResponse.value
          if (!response) {
            setLastInstancesError('Tempo limite ao carregar conexões')
            return
          }
          if (!response.ok) {
            console.error('Erro ao carregar conexões:', await response.text().catch(() => response.status))
            setLastInstancesError('Erro ao carregar conexões')
            return
          }
          const data = await response.json()
          persistInstances(data.connections || [])
          setLastInstancesError(null)
        } else {
          console.error('Erro ao sincronizar conexões:', instancesResponse.reason)
          setLastInstancesError('Erro ao carregar conexões')
        }
      }

      await Promise.all([handleAgentsResult(), handleInstancesResult()])
    } catch (error) {
      console.error('Erro ao sincronizar agentes/conexões:', error)
      setLastAgentsError('Erro ao atualizar agentes')
      setLastInstancesError('Erro ao carregar conexões')
    } finally {
      if (!options.silent && initialAgents.length === 0 && initialInstances.length === 0) {
        setLoading(false)
      }
      setIsRefreshingAgents(false)
      setIsRefreshingInstances(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    loadAgentsAndInstances()
  }, [accessToken])

  const loadInstances = async (options: LoadAgentsOptions = {}) => {
    if (!accessToken) return
    try {
      setIsRefreshingInstances(true)
      const response = await safeFetch(`${baseUrl}/whatsapp/connections`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastInstancesError('Tempo limite ao carregar conexões')
        return
      }

      if (!response.ok) {
        console.error('Erro ao carregar conexões:', await response.text().catch(() => response.status))
        setLastInstancesError('Erro ao carregar conexões')
        return
      }

      const data = await response.json()
      persistInstances(data.connections || [])
      setLastInstancesError(null)
    } catch (error) {
      console.error('Erro ao carregar conexões:', error)
      setLastInstancesError('Erro ao carregar conexões')
    } finally {
      if (!options.silent && agents.length === 0 && instances.length === 0) {
        setLoading(false)
      }
      setIsRefreshingInstances(false)
    }
  }

  const loadAgents = async (options: LoadAgentsOptions = {}) => {
    if (!accessToken) return
    try {
      setIsRefreshingAgents(true)
      const response = await safeFetch(`${baseUrl}/agents`, {
        headers: getHeaders()
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastAgentsError('Tempo limite ao atualizar agentes')
        return
      }

      if (!response.ok) {
        console.error('Erro ao atualizar agentes:', await response.text().catch(() => response.status))
        setLastAgentsError('Erro ao atualizar agentes')
        return
      }

      const data = await response.json()
      const agentsList = data.agents || []
      persistAgents(agentsList)
      setLastAgentsError(null)
    } catch (error) {
      console.error('Error loading agents:', error)
      setLastAgentsError('Erro ao carregar agentes')
    } finally {
      if (!options.silent) {
        setLoading(false)
      }
      setIsRefreshingAgents(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleFormChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePlanChange = (index: number, field: keyof Plan, value: string) => {
    const newPlans = [...formData.planos]
    newPlans[index] = { ...newPlans[index], [field]: value }
    setFormData(prev => ({
      ...prev,
      planos: newPlans
    }))
  }

  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      planos: [...prev.planos, { name: "", includes: "", limits: "", price: "" }]
    }))
  }

  const removePlan = (index: number) => {
    setFormData(prev => ({
      ...prev,
      planos: prev.planos.filter((_, i) => i !== index)
    }))
  }

  const resetForm = () => {
    setFormData(emptyFormData)
    setExpandedSections({
      nome_agente: true,
      quem_atende: true,
      sobre_empresa: false,
      sobre_produto: false,
      planos_precos: false,
      como_funciona: false,
      informacoes_adicionais: false
    })
    setSelectedAgent(null)
    setEditingAgent(false)
  }

  const validateForm = (): boolean => {
    if (!formData.agente_nome.trim()) {
      toast.error('Nome do atendente é obrigatório')
      return false
    }
    if (!formData.empresa_nome.trim()) {
      toast.error('Nome da empresa é obrigatório')
      return false
    }
    if (!formData.produto_o_que_e.trim()) {
      toast.error('Descrição do produto é obrigatória')
      return false
    }
    if (!formData.atendimento_objetivo.trim()) {
      toast.error('Objetivo do atendimento é obrigatório')
      return false
    }
    return true
  }

  const addAgent = async () => {
    if (!validateForm()) return

    try {
      const response = await safeFetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: formData.nome_agente_pnh,
          data: formData,
          status: 'draft'
        })
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastAgentsError('Tempo limite ao criar agente')
        toast.error('Tempo limite ao criar agente')
        return
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        const message = errorPayload?.message || 'Erro ao criar agente'
        setLastAgentsError(message)
        toast.error(message)
        return
      }

      const createdAgent = await response.json() as AgentResponse

      // 📊 NOVO: Consumir informações da resposta melhorada
      if (createdAgent.validation && createdAgent.validation.persisted && createdAgent.validation.prompt_generated) {
        // ✅ Validação bem-sucedida na criação
        console.log('✅ Creation validation confirmed:', createdAgent.validation)
        
        // 📝 Exibir informações do prompt criado
        if (createdAgent.prompt_info) {
          console.log('📊 Prompt criado com sucesso:', {
            hash: createdAgent.prompt_info.hash,
            lines: createdAgent.prompt_info.preview?.total_lines,
            chars: createdAgent.prompt_info.preview?.total_chars,
            words: createdAgent.prompt_info.preview?.total_words
          })
          
          toast.success(
            `✅ Agente criado com sucesso! Prompt gerado (${createdAgent.prompt_info.preview?.total_lines} linhas, ${createdAgent.prompt_info.preview?.total_chars} caracteres)`
          )
        }
      } else if (createdAgent.success) {
        // Fallback se resposta não tiver nova estrutura
        console.warn('⚠️ Resposta de criação sem estrutura de validation')
        toast.success('Agente criado!')
      }

      if (formData.conexao_whatsapp && createdAgent.agent?.id) {
        await assignAgentInstance(createdAgent.agent.id, formData.conexao_whatsapp)
      }

      await loadAgents({ silent: true })
      setCreatingNewAgent(false)
      resetForm()
      setLastAgentsError(null)
      toast.success('Agente criado!')
    } catch (error) {
      console.error('Error creating agent:', error)
      toast.error('Erro ao criar agente')
    }
  }

  const deleteAgent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return

    try {
      const response = await safeFetch(`${baseUrl}/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastAgentsError('Tempo limite ao excluir agente')
        toast.error('Tempo limite ao excluir agente')
        return
      }

      if (!response.ok) {
        setLastAgentsError('Erro ao excluir agente')
        toast.error('Erro ao excluir agente')
        return
      }

      await loadAgents({ silent: true })
      setLastAgentsError(null)
      toast.success('Agente excluído!')
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast.error('Erro ao excluir agente')
    }
  }

  const toggleAgentStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active'

    try {
      const response = await safeFetch(`${baseUrl}/agents/${agent.id}`, {
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
        setLastAgentsError('Tempo limite ao atualizar status do agente')
        toast.error('Tempo limite ao atualizar status')
        return
      }

      if (!response.ok) {
        setLastAgentsError('Erro ao atualizar status')
        toast.error('Erro ao atualizar status')
        return
      }

      await loadAgents({ silent: true })
      setLastAgentsError(null)
      toast.success(`Agente ${newStatus === 'active' ? 'ativado' : 'pausado'}!`)
    } catch (error) {
      console.error('Error updating agent status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const duplicateAgent = async (agent: Agent) => {
    try {
      const newData = { ...agent.data, nome_agente_pnh: `${agent.data.nome_agente_pnh} (Cópia)` }
      const response = await safeFetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newData.nome_agente_pnh,
          data: newData,
          status: 'draft'
        })
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      if (!response) {
        setLastAgentsError('Tempo limite ao duplicar agente')
        toast.error('Tempo limite ao duplicar agente')
        return
      }

      if (!response.ok) {
        setLastAgentsError('Erro ao duplicar agente')
        toast.error('Erro ao duplicar agente')
        return
      }

      await loadAgents({ silent: true })
      setLastAgentsError(null)
      toast.success('Agente duplicado!')
    } catch (error) {
      console.error('Error duplicating agent:', error)
      toast.error('Erro ao duplicar agente')
    }
  }

  const viewAgentPrompt = async (agent: Agent) => {
    try {
      const baseUrl = getApiUrl()
      const response = await fetch(`${baseUrl}/agents/${agent.id}/prompt`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json() as PromptViewResponse

      if (data.success) {
        // Mostrar modal com o prompt completo
        const statsText = `
📊 ESTATÍSTICAS:
  • Linhas: ${data.statistics.total_lines}
  • Caracteres: ${data.statistics.total_chars}
  • Palavras: ${data.statistics.total_words}
  • Hash: ${data.statistics.prompt_hash.substring(0, 16)}...
  • Atualizado: ${new Date(data.statistics.generated_at).toLocaleString('pt-BR')}
        `.trim()

        // Copiar para clipboard e mostrar toast
        const fullText = `${data.prompt}\n\n${statsText}`
        await navigator.clipboard.writeText(fullText)

        toast.success(
          `✅ Prompt copiado! ${data.statistics.total_lines} linhas, ${data.statistics.total_chars} caracteres`,
          {
            duration: 3000,
            action: {
              label: 'Ver',
              onClick: () => {
                // Abrir em uma janela modal ou textarea
                const modal = document.createElement('div')
                modal.innerHTML = `
                  <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                    <div style="background: white; border-radius: 8px; max-width: 90%; max-height: 90%; overflow: auto; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${data.agent_name} - Prompt</h2>
                        <button onclick="this.closest('[role=dialog]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                      </div>
                      <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Monaco', 'Courier New', monospace; font-size: 12px; line-height: 1.5; color: #333; background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 0 0 15px 0; max-height: 500px; overflow-y: auto;">${data.prompt}</pre>
                      <div style="background: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 12px; color: #666; border-left: 3px solid #0066cc;">
                        <strong>Estatísticas:</strong><br/>
                        Linhas: ${data.statistics.total_lines} | Caracteres: ${data.statistics.total_chars} | Palavras: ${data.statistics.total_words}<br/>
                        Hash: <code style="background: #ddd; padding: 2px 4px; border-radius: 2px;">${data.statistics.prompt_hash.substring(0, 32)}</code><br/>
                        Atualizado: ${new Date(data.statistics.generated_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                `
                document.body.appendChild(modal)
                modal.addEventListener('click', (e) => {
                  if (e.target === modal) modal.remove()
                })
              }
            }
          }
        )

        console.log('✅ Prompt do agente:', {
          agent_id: data.agent_id,
          agent_name: data.agent_name,
          statistics: data.statistics,
          prompt_preview: data.prompt.substring(0, 200) + '...'
        })
      } else {
        toast.error('Falha ao recuperar prompt')
      }
    } catch (error) {
      console.error('❌ Erro ao visualizar prompt:', error)
      toast.error('Erro ao visualizar prompt do agente')
    }
  }

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent)
    loadInstances({ silent: true })
    
    // Criar um sanitizer de dados para garantir que nenhum valor seja null/undefined
    const sanitizeData = (data: any): AgentFormData => {
      return {
        nome_agente_pnh: data?.nome_agente_pnh ?? "",
        conexao_whatsapp: data?.conexao_whatsapp ?? "",
        agente_nome: data?.agente_nome ?? "",
        agente_funcao: data?.agente_funcao ?? "",
        agente_jeito_falar: data?.agente_jeito_falar ?? "",
        agente_nao_fazer: data?.agente_nao_fazer ?? "",
        empresa_nome: data?.empresa_nome ?? "",
        empresa_o_que_faz: data?.empresa_o_que_faz ?? "",
        empresa_diferenciais: data?.empresa_diferenciais ?? "",
        empresa_nao_faz: data?.empresa_nao_faz ?? "",
        produto_o_que_e: data?.produto_o_que_e ?? "",
        produto_funcionalidades: data?.produto_funcionalidades ?? "",
        produto_beneficios: data?.produto_beneficios ?? "",
        produto_publico: data?.produto_publico ?? "",
        planos: Array.isArray(data?.planos) && data.planos.length > 0 
          ? data.planos.map((p: any) => ({
              name: p?.name ?? "",
              includes: p?.includes ?? "",
              limits: p?.limits ?? "",
              price: p?.price ?? "",
              extras: p?.extras ?? ""
            }))
          : [{ name: "", includes: "", limits: "", price: "" }],
        planos_teste_gratis: data?.planos_teste_gratis ?? "",
        planos_pagamento: data?.planos_pagamento ?? "",
        planos_reembolso: data?.planos_reembolso ?? "",
        planos_links: data?.planos_links ?? "",
        atendimento_objetivo: data?.atendimento_objetivo ?? "",
        atendimento_conducao: data?.atendimento_conducao ?? "",
        atendimento_frases_sugeridas: data?.atendimento_frases_sugeridas ?? "",
        atendimento_evitar: data?.atendimento_evitar ?? "",
        atendimento_resposta_padrao_fora_escopo: data?.atendimento_resposta_padrao_fora_escopo ?? "",
        informacoes_adicionais: data?.informacoes_adicionais ?? ""
      }
    }
    
    const mergedData = sanitizeData(agent.data)
    setFormData(mergedData)
    
    // 🔥 AUTO-EXPANDIR TODOS OS BLOCOS AO EDITAR para mostrar todos os dados
    setExpandedSections({
      nome_agente: true,
      quem_atende: true,
      sobre_empresa: true,
      sobre_produto: true,
      planos_precos: true,
      como_funciona: true,
      informacoes_adicionais: true
    })
    
    setEditingAgent(true)
  }

  const updateAgent = async () => {
    console.log('🔍 DEBUG: updateAgent called')
    console.log('🔍 DEBUG: selectedAgent:', selectedAgent)
    console.log('🔍 DEBUG: formData.informacoes_adicionais length:', formData.informacoes_adicionais.length)

    if (!selectedAgent) {
      console.log('🔍 DEBUG: No selectedAgent')
      toast.error('Nenhum agente selecionado')
      return
    }

    if (!validateForm()) {
      console.log('🔍 DEBUG: validateForm failed')
      return
    }

    if (!accessToken) {
      console.log('🔍 DEBUG: No accessToken')
      toast.error('Token não encontrado. Faça login novamente.')
      return
    }

    console.log('🔍 DEBUG: Starting update process')

    try {
      // Sanitizar dados antes de enviar (converter null para "")
      const sanitizedData = {
        nome_agente_pnh: formData.nome_agente_pnh || "",
        conexao_whatsapp: formData.conexao_whatsapp || "",
        agente_nome: formData.agente_nome || "",
        agente_funcao: formData.agente_funcao || "",
        agente_jeito_falar: formData.agente_jeito_falar || "",
        agente_nao_fazer: formData.agente_nao_fazer || "",
        empresa_nome: formData.empresa_nome || "",
        empresa_o_que_faz: formData.empresa_o_que_faz || "",
        empresa_diferenciais: formData.empresa_diferenciais || "",
        empresa_nao_faz: formData.empresa_nao_faz || "",
        produto_o_que_e: formData.produto_o_que_e || "",
        produto_funcionalidades: formData.produto_funcionalidades || "",
        produto_beneficios: formData.produto_beneficios || "",
        produto_publico: formData.produto_publico || "",
        planos: formData.planos || [{ name: "", includes: "", limits: "", price: "" }],
        planos_teste_gratis: formData.planos_teste_gratis || "",
        planos_pagamento: formData.planos_pagamento || "",
        planos_reembolso: formData.planos_reembolso || "",
        planos_links: formData.planos_links || "",
        atendimento_objetivo: formData.atendimento_objetivo || "",
        atendimento_conducao: formData.atendimento_conducao || "",
        atendimento_frases_sugeridas: formData.atendimento_frases_sugeridas || "",
        atendimento_evitar: formData.atendimento_evitar || "",
        atendimento_resposta_padrao_fora_escopo: formData.atendimento_resposta_padrao_fora_escopo || "",
        informacoes_adicionais: formData.informacoes_adicionais || ""
      }

      console.log('🔍 DEBUG: sanitizedData.informacoes_adicionais length:', sanitizedData.informacoes_adicionais.length)
      console.log('🔍 DEBUG: Making fetch request to:', `${baseUrl}/agents/${selectedAgent.id}`)

      const response = await safeFetch(`${baseUrl}/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: sanitizedData.nome_agente_pnh,
          data: sanitizedData
        })
      }, { timeout: FETCH_DEFAULT_TIMEOUT })

      console.log('🔍 DEBUG: Fetch response received:', response)

      if (!response) {
        console.log('🔍 DEBUG: No response from server')
        setLastAgentsError('Tempo limite ao atualizar agente')
        toast.error('Tempo limite ao atualizar agente')
        return
      }

      if (!response.ok) {
        console.log('🔍 DEBUG: Response not ok:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Update error response:', errorData)
        const message = errorData?.message || errorData?.error || 'Erro ao atualizar agente'
        setLastAgentsError(message)
        toast.error(message)
        return
      }

      console.log('🔍 DEBUG: Response ok, parsing JSON')
      const result = await response.json() as AgentResponse
      console.log('🔍 DEBUG: Update result:', result)

      // 📊 NOVO: Consumir informações da resposta melhorada
      if (result.validation && result.validation.persisted && result.validation.prompt_generated) {
        // ✅ Validação bem-sucedida
        console.log('✅ Validation confirmed:', result.validation)
        
        // 📝 Se houve mudanças, exibir detalhes
        if (result.changes && result.changes.fields_modified_count > 0) {
          const fieldsChanged = result.changes.fields_modified_count
          const promptChanged = result.changes.prompt_changed
          
          console.log(`✅ ${fieldsChanged} campo(s) alterado(s), Prompt regenerado: ${promptChanged}`)
          
          // 🎯 Toast com detalhes da mudança
          toast.success(
            promptChanged
              ? `✅ Agente atualizado! ${fieldsChanged} campo(s) alterado(s) + prompt regenerado`
              : `✅ Agente atualizado! ${fieldsChanged} campo(s) alterado(s)`
          )
          
          // 📊 Log detalhado das mudanças para auditoria
          if (result.changes.fields_modified && Object.keys(result.changes.fields_modified).length > 0) {
            console.log('📝 Campos modificados:')
            Object.entries(result.changes.fields_modified).forEach(([field, change]: [string, any]) => {
              console.log(`  • ${field}:`, change)
            })
          }
          
          // 🔐 Hash do prompt para rastreamento
          if (result.prompt_info) {
            console.log('📊 Prompt Info:', {
              hash: result.prompt_info.hash,
              preview: result.prompt_info.preview,
              regenerated: result.prompt_info.regenerated
            })
          }
        } else {
          // Nenhuma mudança detectada
          console.log('ℹ️ Nenhuma mudança de dados detectada')
          toast.info('Agente salvo (nenhuma alteração de dados detectada)')
        }
      } else if (result.success) {
        // Fallback se resposta não tiver nova estrutura
        console.warn('⚠️ Resposta sem estrutura de validation completa')
        toast.success('Agente atualizado com sucesso!')
      }

      if (sanitizedData.conexao_whatsapp) {
        console.log('🔍 DEBUG: Assigning WhatsApp instance')
        await assignAgentInstance(selectedAgent.id, sanitizedData.conexao_whatsapp)
      }

      console.log('🔍 DEBUG: Reloading agents')
      await loadAgents({ silent: true })
      setEditingAgent(false)
      resetForm()
      setLastAgentsError(null)
      toast.success('Agente atualizado com sucesso!')
      console.log('✅ Agent updated successfully')
    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error(`Erro ao atualizar agente: ${(error as Error).message}`)
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
      case 'active': return 'Ativo'
      case 'paused': return 'Pausado'
      case 'draft': return 'Rascunho'
      default: return status
    }
  }

  const totalUsage = agents.reduce((sum, a) => sum + (a.usageCount ?? 0), 0)

  const isRefreshingAnything = isRefreshingAgents || isRefreshingInstances
  const showStatusInfo = loading || isRefreshingAnything || lastAgentsSync || lastAgentsError || lastInstancesSync || lastInstancesError

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {showStatusInfo && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1 flex-wrap">
                {loading && !isRefreshingAnything && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Preparando agentes...
                  </span>
                )}
                {isRefreshingAgents && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Atualizando agentes...
                  </span>
                )}
                {isRefreshingInstances && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Atualizando conexões...
                  </span>
                )}
                {lastAgentsSync && <span>Agentes sincronizados: {lastAgentsSync}</span>}
                {lastInstancesSync && <span>Conexões sincronizadas: {lastInstancesSync}</span>}
                {lastAgentsError && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    {lastAgentsError}
                  </span>
                )}
                {lastInstancesError && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    {lastInstancesError}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Agentes PNH (Pessoas Não Humanas)</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure agentes de IA personalizados para seus atendimentos
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                loadAgentsAndInstances({ silent: true })
              }}
              disabled={isRefreshingAnything}
            >
              {isRefreshingAnything ? (
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

            {!creatingNewAgent && (
              <Button className="gap-2" onClick={() => {
                resetForm()
                setCreatingNewAgent(true)
              }}>
                <Plus className="w-4 h-4" />
                Novo Agente
              </Button>
            )}
          </div>
        </div>

        {/* New Agent Form */}
        {creatingNewAgent && (
          <Card className="border border-slate-200 bg-slate-100/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Criar Novo Agente</CardTitle>
                  <CardDescription>
                    Preencha todas as seções para configurar seu agente de IA
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreatingNewAgent(false)
                    resetForm()
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 0. NOME DO AGENTE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('nome_agente')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">0. NOME DO AGENTE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.nome_agente ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.nome_agente && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="conexao_whatsapp">Conexão Whatsapp *</Label>
                      <div style={{ position: 'relative' }}>
                        <select
                          id="conexao_whatsapp"
                          value={formData.conexao_whatsapp}
                          onChange={(e) => handleFormChange('conexao_whatsapp', e.target.value)}
                          style={{
                            color: '#000000 !important' as any,
                            backgroundColor: '#ffffff !important' as any,
                            padding: '10px 12px !important' as any,
                            border: '1px solid #cbd5e1 !important' as any,
                            borderRadius: '6px !important' as any,
                            fontSize: '14px !important' as any,
                            cursor: 'pointer !important' as any,
                            width: '100% !important' as any,
                            appearance: 'auto !important' as any,
                          }}
                        >
                          <option value="">Selecione uma conexão...</option>
                          {instances.length > 0 ? (
                            instances.map((inst) => (
                              <option key={inst.id} value={inst.instanceName}>
                                {inst.connectionName}
                              </option>
                            ))
                          ) : (
                            <option disabled>Nenhuma instância disponível</option>
                          )}
                        </select>
                      </div>
                      {lastInstancesError && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{lastInstancesError}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => loadInstances({ silent: true })}
                            disabled={isRefreshingInstances}
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      )}
                      {lastInstancesSync && (
                        <p className="text-[11px] text-muted-foreground">
                          Última atualização das conexões: {lastInstancesSync}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">Escolha qual conexão WhatsApp este agente utilizará</p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="nome_agente_pnh">Identificador do Agente PNH *</Label>
                      <Input
                        id="nome_agente_pnh"
                        placeholder="Ex: Agente de Vendas 1, Bot de Suporte Premium, IA Consultora VIP"
                        value={formData.nome_agente_pnh}
                        onChange={(e) => handleFormChange('nome_agente_pnh', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 1. QUEM ATENDE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('quem_atende')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">1. QUEM ATENDE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.quem_atende ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.quem_atende && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="agente_nome">1.1 Nome do atendente *</Label>
                      <Input
                        id="agente_nome"
                        placeholder="Ex: Murilo, Ricardo, Ana do Suporte"
                        value={formData.agente_nome}
                        onChange={(e) => handleFormChange('agente_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_funcao">1.2 Função do atendente</Label>
                      <Input
                        id="agente_funcao"
                        placeholder="Ex: Suporte, Consultor, Vendas, Atendimento Comercial"
                        value={formData.agente_funcao}
                        onChange={(e) => handleFormChange('agente_funcao', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_jeito_falar">1.3 Jeito de falar</Label>
                      <Input
                        id="agente_jeito_falar"
                        placeholder="Ex: Bem direto e claro, Amigável e simples, Profissional e consultivo"
                        value={formData.agente_jeito_falar}
                        onChange={(e) => handleFormChange('agente_jeito_falar', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_nao_fazer">1.4 Coisas que não deve fazer</Label>
                      <Textarea
                        id="agente_nao_fazer"
                        placeholder="Ex: Não marcar reuniões, Não prometer nada fora dos planos, Não criar soluções personalizadas"
                        value={formData.agente_nao_fazer}
                        onChange={(e) => handleFormChange('agente_nao_fazer', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SOBRE A EMPRESA */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_empresa')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">2. SOBRE A SUA EMPRESA</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_empresa ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_empresa && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="empresa_nome">2.1 Nome da empresa *</Label>
                      <Input
                        id="empresa_nome"
                        placeholder="Ex: VAI - Vendedor Automático Inteligente"
                        value={formData.empresa_nome}
                        onChange={(e) => handleFormChange('empresa_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_o_que_faz">2.2 O que a empresa faz (em poucas palavras)</Label>
                      <Input
                        id="empresa_o_que_faz"
                        placeholder="Ex: Automação comercial, Contabilidade para e-commerce, Marketing digital"
                        value={formData.empresa_o_que_faz}
                        onChange={(e) => handleFormChange('empresa_o_que_faz', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_diferenciais">2.3 Diferenciais da empresa</Label>
                      <Textarea
                        id="empresa_diferenciais"
                        placeholder="Ex: 25 anos de mercado, Atendimento humanizado, Tecnologia própria"
                        value={formData.empresa_diferenciais}
                        onChange={(e) => handleFormChange('empresa_diferenciais', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_nao_faz">2.4 Coisas que a empresa não faz</Label>
                      <Textarea
                        id="empresa_nao_faz"
                        placeholder="Ex: Não desenvolve sistemas sob medida, Não oferece consultoria individual"
                        value={formData.empresa_nao_faz}
                        onChange={(e) => handleFormChange('empresa_nao_faz', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SOBRE O PRODUTO/SERVIÇO */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_produto')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">3. SOBRE O SEU PRODUTO/SERVIÇO</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_produto ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_produto && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="produto_o_que_e">3.1 O que é o produto/serviço (descrição simples) *</Label>
                      <Input
                        id="produto_o_que_e"
                        placeholder="Ex: Sistema de automação comercial, Plataforma de artigos automáticos"
                        value={formData.produto_o_que_e}
                        onChange={(e) => handleFormChange('produto_o_que_e', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_funcionalidades">3.2 Principais funcionalidades (1 por linha)</Label>
                      <Textarea
                        id="produto_funcionalidades"
                        placeholder="Ex: Emissão fiscal&#10;Controle de estoque&#10;Integração com WhatsApp"
                        value={formData.produto_funcionalidades}
                        onChange={(e) => handleFormChange('produto_funcionalidades', e.target.value)}
                        rows={4}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_beneficios">3.3 Principais benefícios para o cliente</Label>
                      <Textarea
                        id="produto_beneficios"
                        placeholder="Ex: Reduz tempo de operação&#10;Melhora vendas&#10;Simplifica processos"
                        value={formData.produto_beneficios}
                        onChange={(e) => handleFormChange('produto_beneficios', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_publico">3.4 Para quem é indicado</Label>
                      <Input
                        id="produto_publico"
                        placeholder="Ex: E-commerces, Mercados, Profissionais autônomos"
                        value={formData.produto_publico}
                        onChange={(e) => handleFormChange('produto_publico', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. PLANOS E PREÇOS */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('planos_precos')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">4. PLANOS E PREÇOS</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.planos_precos ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.planos_precos && (
                  <div className="p-4 space-y-4 border-t bg-white">

                    {/* Plans List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">4.1 Seus planos</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPlan}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Plano
                        </Button>
                      </div>

                      {formData.planos.map((plan, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Plano {index + 1}</Label>
                              {formData.planos.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePlan(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`plan-name-${index}`} className="text-sm">Nome</Label>
                                <Input
                                  id={`plan-name-${index}`}
                                  placeholder="Ex: Básico"
                                  value={plan.name}
                                  onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`plan-price-${index}`} className="text-sm">Preço</Label>
                                <Input
                                  id={`plan-price-${index}`}
                                  placeholder="Ex: R$ 99/mês"
                                  value={plan.price}
                                  onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`plan-includes-${index}`} className="text-sm">O que inclui</Label>
                              <Textarea
                                id={`plan-includes-${index}`}
                                placeholder="Ex: Até 100 contatos, Suporte via email"
                                value={plan.includes}
                                onChange={(e) => handlePlanChange(index, 'includes', e.target.value)}
                                rows={2}
                                className="border border-slate-300"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`plan-limits-${index}`} className="text-sm">Limites</Label>
                              <Input
                                id={`plan-limits-${index}`}
                                placeholder="Ex: 1000 msgs/mês"
                                value={plan.limits}
                                onChange={(e) => handlePlanChange(index, 'limits', e.target.value)}
                                className="border border-slate-300"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="planos_teste_gratis">4.2 Teste grátis (se houver)</Label>
                      <Input
                        id="planos_teste_gratis"
                        placeholder="Ex: 7 dias, 5 usos, Sem teste"
                        value={formData.planos_teste_gratis}
                        onChange={(e) => handleFormChange('planos_teste_gratis', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_pagamento">4.3 Formas de pagamento</Label>
                      <Input
                        id="planos_pagamento"
                        placeholder="Ex: Pix, Cartão, Assinatura mensal"
                        value={formData.planos_pagamento}
                        onChange={(e) => handleFormChange('planos_pagamento', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_reembolso">4.4 Política de reembolso</Label>
                      <Input
                        id="planos_reembolso"
                        placeholder="Ex: Não há reembolso por ser SaaS pré-pago"
                        value={formData.planos_reembolso}
                        onChange={(e) => handleFormChange('planos_reembolso', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_links">4.5 Links oficiais</Label>
                      <Textarea
                        id="planos_links"
                        placeholder="Ex: site, checkout, manual, vídeo explicativo"
                        value={formData.planos_links}
                        onChange={(e) => handleFormChange('planos_links', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. COMO O ATENDIMENTO DEVE FUNCIONAR */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('como_funciona')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">5. COMO O ATENDIMENTO DEVE FUNCIONAR</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.como_funciona ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.como_funciona && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="atendimento_objetivo">5.1 Qual é o objetivo do atendimento *</Label>
                      <Input
                        id="atendimento_objetivo"
                        placeholder="Ex: Fechar vendas, Gerar reuniões, Qualificar leads, Suporte + venda leve"
                        value={formData.atendimento_objetivo}
                        onChange={(e) => handleFormChange('atendimento_objetivo', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_conducao">5.2 Como o atendente deve conduzir a conversa</Label>
                      <Textarea
                        id="atendimento_conducao"
                        placeholder="Ex: Ser claro e direto. Ajudar sem parecer vendedor demais. Indicar o plano ideal quando fizer sentido."
                        value={formData.atendimento_conducao}
                        onChange={(e) => handleFormChange('atendimento_conducao', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_frases_sugeridas">5.3 Frases que gostaria que o atendente usasse (opcional)</Label>
                      <Textarea
                        id="atendimento_frases_sugeridas"
                        placeholder="Ex: 'Quer que eu te envie o link do plano ideal?'&#10;'Deixa eu ver qual opção fica melhor pra você.'"
                        value={formData.atendimento_frases_sugeridas}
                        onChange={(e) => handleFormChange('atendimento_frases_sugeridas', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_evitar">5.4 Perguntas ou assuntos que o atendente deve evitar</Label>
                      <Textarea
                        id="atendimento_evitar"
                        placeholder="Ex: Temas sensíveis, política, saúde, finanças pessoais"
                        value={formData.atendimento_evitar}
                        onChange={(e) => handleFormChange('atendimento_evitar', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_resposta_padrao_fora_escopo">5.5 Resposta padrão para pedidos fora do escopo</Label>
                      <Textarea
                        id="atendimento_resposta_padrao_fora_escopo"
                        placeholder="Ex: 'Entendi, mas hoje não fazemos esse tipo de serviço. Posso te ajudar a escolher o melhor plano?'"
                        value={formData.atendimento_resposta_padrao_fora_escopo}
                        onChange={(e) => handleFormChange('atendimento_resposta_padrao_fora_escopo', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. INFORMAÇÕES ADICIONAIS */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('informacoes_adicionais')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">6. INFORMAÇÕES ADICIONAIS</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.informacoes_adicionais ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.informacoes_adicionais && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="informacoes_adicionais">
                        6.1 Informações adicionais (opcional)
                      </Label>
                      <Textarea
                        id="informacoes_adicionais"
                        placeholder="Adicione aqui qualquer informação adicional que o agente deve conhecer e usar durante as conversas. Por exemplo: promoções especiais, políticas específicas, informações sobre a equipe, etc."
                        value={formData.informacoes_adicionais}
                        onChange={(e) => handleFormChange('informacoes_adicionais', e.target.value)}
                        rows={6}
                        maxLength={5000}
                        className="border border-slate-300"
                      />
                      <p className={`text-xs ${formData.informacoes_adicionais.length > 5000 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {formData.informacoes_adicionais.length > 5000
                          ? `${formData.informacoes_adicionais.length}/5000 - reduza ${formData.informacoes_adicionais.length - 5000} caracteres`
                          : `${formData.informacoes_adicionais.length}/5000 caracteres`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => {
                  setCreatingNewAgent(false)
                  resetForm()
                }}>
                  Cancelar
                </Button>
                <Button onClick={async () => {
                  await addAgent()
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Agente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Agentes</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agentes Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {agents.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usos</p>
                  <p className="text-2xl font-bold">{totalUsage}</p>
                </div>
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Rascunho</p>
                  <p className="text-2xl font-bold">
                    {agents.filter(a => a.status === 'draft').length}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhum agente criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro agente configurando identidade, empresa, produto e atendimento
              </p>
              <Button onClick={() => {
                resetForm()
                setCreatingNewAgent(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {agent.data.empresa_nome}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAgentStatus(agent)}
                      className="flex-1"
                    >
                      {agent.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewAgentPrompt(agent)}
                      title="Visualizar prompt gerado"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(agent)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateAgent(agent)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAgent(agent.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Agent Form - Full Page */}
        {editingAgent && (
          <Card className="border border-slate-200 bg-slate-100/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Editar Agente</CardTitle>
                  <CardDescription>
                    Atualize as configurações do agente
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAgent(false)
                    resetForm()
                    setSelectedAgent(null)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 0. NOME DO AGENTE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('nome_agente')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">0. NOME DO AGENTE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.nome_agente ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.nome_agente && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-conexao_whatsapp">Conexão Whatsapp *</Label>
                      <div style={{ position: 'relative' }}>
                        <select
                          id="edit-conexao_whatsapp"
                          value={formData.conexao_whatsapp}
                          onChange={(e) => handleFormChange('conexao_whatsapp', e.target.value)}
                          style={{
                            color: '#000000 !important' as any,
                            backgroundColor: '#ffffff !important' as any,
                            padding: '10px 12px !important' as any,
                            border: '1px solid #cbd5e1 !important' as any,
                            borderRadius: '6px !important' as any,
                            fontSize: '14px !important' as any,
                            cursor: 'pointer !important' as any,
                            width: '100% !important' as any,
                            appearance: 'auto !important' as any,
                          }}
                        >
                          <option value="">Selecione uma conexão...</option>
                          {instances.length > 0 ? (
                            instances.map((inst) => (
                              <option key={inst.id} value={inst.instanceName}>
                                {inst.connectionName}
                              </option>
                            ))
                          ) : (
                            <option disabled>Nenhuma instância disponível</option>
                          )}
                        </select>
                      </div>
                      <p className="text-xs text-slate-500">Escolha qual conexão WhatsApp este agente utilizará</p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="edit-nome_agente_pnh">Identificador do Agente PNH *</Label>
                      <Input
                        id="edit-nome_agente_pnh"
                        placeholder="Ex: Agente de Vendas 1, Bot de Suporte Premium, IA Consultora VIP"
                        value={formData.nome_agente_pnh}
                        onChange={(e) => handleFormChange('nome_agente_pnh', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 1. QUEM ATENDE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('quem_atende')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">1. QUEM ATENDE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.quem_atende ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.quem_atende && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-agente_nome">1.1 Nome do atendente *</Label>
                      <Input
                        id="edit-agente_nome"
                        placeholder="Ex: Murilo, Ricardo, Ana do Suporte"
                        value={formData.agente_nome}
                        onChange={(e) => handleFormChange('agente_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-agente_funcao">1.2 Função do atendente</Label>
                      <Input
                        id="edit-agente_funcao"
                        placeholder="Ex: Suporte, Consultor, Vendas, Atendimento Comercial"
                        value={formData.agente_funcao}
                        onChange={(e) => handleFormChange('agente_funcao', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-agente_jeito_falar">1.3 Jeito de falar</Label>
                      <Input
                        id="edit-agente_jeito_falar"
                        placeholder="Ex: Bem direto e claro, Amigável e simples, Profissional e consultivo"
                        value={formData.agente_jeito_falar}
                        onChange={(e) => handleFormChange('agente_jeito_falar', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-agente_nao_fazer">1.4 Coisas que não deve fazer</Label>
                      <Textarea
                        id="edit-agente_nao_fazer"
                        placeholder="Ex: Não marcar reuniões, Não prometer nada fora dos planos, Não criar soluções personalizadas"
                        value={formData.agente_nao_fazer}
                        onChange={(e) => handleFormChange('agente_nao_fazer', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SOBRE A EMPRESA */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_empresa')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">2. SOBRE A SUA EMPRESA</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_empresa ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_empresa && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-empresa_nome">2.1 Nome da empresa *</Label>
                      <Input
                        id="edit-empresa_nome"
                        placeholder="Ex: VAI - Vendedor Automático Inteligente"
                        value={formData.empresa_nome}
                        onChange={(e) => handleFormChange('empresa_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-empresa_o_que_faz">2.2 O que a empresa faz (em poucas palavras)</Label>
                      <Input
                        id="edit-empresa_o_que_faz"
                        placeholder="Ex: Automação comercial, Contabilidade para e-commerce, Marketing digital"
                        value={formData.empresa_o_que_faz}
                        onChange={(e) => handleFormChange('empresa_o_que_faz', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-empresa_diferenciais">2.3 Diferenciais da empresa</Label>
                      <Textarea
                        id="edit-empresa_diferenciais"
                        placeholder="Ex: 25 anos de mercado, Atendimento humanizado, Tecnologia própria"
                        value={formData.empresa_diferenciais}
                        onChange={(e) => handleFormChange('empresa_diferenciais', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-empresa_nao_faz">2.4 Coisas que a empresa não faz</Label>
                      <Textarea
                        id="edit-empresa_nao_faz"
                        placeholder="Ex: Não desenvolve sistemas sob medida, Não oferece consultoria individual"
                        value={formData.empresa_nao_faz}
                        onChange={(e) => handleFormChange('empresa_nao_faz', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SOBRE O PRODUTO/SERVIÇO */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_produto')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">3. SOBRE O SEU PRODUTO/SERVIÇO</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_produto ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_produto && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-produto_o_que_e">3.1 O que é o produto/serviço (descrição simples) *</Label>
                      <Input
                        id="edit-produto_o_que_e"
                        placeholder="Ex: Sistema de automação comercial, Plataforma de artigos automáticos"
                        value={formData.produto_o_que_e}
                        onChange={(e) => handleFormChange('produto_o_que_e', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-produto_funcionalidades">3.2 Principais funcionalidades (1 por linha)</Label>
                      <Textarea
                        id="edit-produto_funcionalidades"
                        placeholder="Ex: Emissão fiscal&#10;Controle de estoque&#10;Integração com WhatsApp"
                        value={formData.produto_funcionalidades}
                        onChange={(e) => handleFormChange('produto_funcionalidades', e.target.value)}
                        rows={4}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-produto_beneficios">3.3 Principais benefícios para o cliente</Label>
                      <Textarea
                        id="edit-produto_beneficios"
                        placeholder="Ex: Reduz tempo de operação&#10;Melhora vendas&#10;Simplifica processos"
                        value={formData.produto_beneficios}
                        onChange={(e) => handleFormChange('produto_beneficios', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-produto_publico">3.4 Para quem é indicado</Label>
                      <Input
                        id="edit-produto_publico"
                        placeholder="Ex: E-commerces, Mercados, Profissionais autônomos"
                        value={formData.produto_publico}
                        onChange={(e) => handleFormChange('produto_publico', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. PLANOS E PREÇOS */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('planos_precos')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">4. PLANOS E PREÇOS</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.planos_precos ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.planos_precos && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">4.1 Seus planos</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPlan}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Plano
                        </Button>
                      </div>
                      {formData.planos.map((plan, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Plano {index + 1}</Label>
                              {formData.planos.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePlan(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`edit-plan-name-${index}`} className="text-sm">Nome</Label>
                                <Input
                                  id={`edit-plan-name-${index}`}
                                  placeholder="Ex: Básico"
                                  value={plan.name}
                                  onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`edit-plan-price-${index}`} className="text-sm">Preço</Label>
                                <Input
                                  id={`edit-plan-price-${index}`}
                                  placeholder="Ex: R$ 99/mês"
                                  value={plan.price}
                                  onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-plan-includes-${index}`} className="text-sm">O que inclui</Label>
                              <Textarea
                                id={`edit-plan-includes-${index}`}
                                placeholder="Ex: Até 100 contatos, Suporte via email"
                                value={plan.includes}
                                onChange={(e) => handlePlanChange(index, 'includes', e.target.value)}
                                rows={2}
                                className="border border-slate-300"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-plan-limits-${index}`} className="text-sm">Limites</Label>
                              <Input
                                id={`edit-plan-limits-${index}`}
                                placeholder="Ex: 1000 msgs/mês"
                                value={plan.limits}
                                onChange={(e) => handlePlanChange(index, 'limits', e.target.value)}
                                className="border border-slate-300"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="edit-planos_teste_gratis">4.2 Teste grátis (se houver)</Label>
                      <Input
                        id="edit-planos_teste_gratis"
                        placeholder="Ex: 7 dias, 5 usos, Sem teste"
                        value={formData.planos_teste_gratis}
                        onChange={(e) => handleFormChange('planos_teste_gratis', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-planos_pagamento">4.3 Formas de pagamento</Label>
                      <Input
                        id="edit-planos_pagamento"
                        placeholder="Ex: Pix, Cartão, Assinatura mensal"
                        value={formData.planos_pagamento}
                        onChange={(e) => handleFormChange('planos_pagamento', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-planos_reembolso">4.4 Política de reembolso</Label>
                      <Input
                        id="edit-planos_reembolso"
                        placeholder="Ex: Não há reembolso por ser SaaS pré-pago"
                        value={formData.planos_reembolso}
                        onChange={(e) => handleFormChange('planos_reembolso', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-planos_links">4.5 Links oficiais</Label>
                      <Textarea
                        id="edit-planos_links"
                        placeholder="Ex: site, checkout, manual, vídeo explicativo"
                        value={formData.planos_links}
                        onChange={(e) => handleFormChange('planos_links', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. COMO O ATENDIMENTO DEVE FUNCIONAR */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('como_funciona')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">5. COMO O ATENDIMENTO DEVE FUNCIONAR</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.como_funciona ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.como_funciona && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-atendimento_objetivo">5.1 Qual é o objetivo do atendimento *</Label>
                      <Input
                        id="edit-atendimento_objetivo"
                        placeholder="Ex: Fechar vendas, Gerar reuniões, Qualificar leads, Suporte + venda leve"
                        value={formData.atendimento_objetivo}
                        onChange={(e) => handleFormChange('atendimento_objetivo', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-atendimento_conducao">5.2 Como o atendente deve conduzir a conversa</Label>
                      <Textarea
                        id="edit-atendimento_conducao"
                        placeholder="Ex: Ser claro e direto. Ajudar sem parecer vendedor demais. Indicar o plano ideal quando fizer sentido."
                        value={formData.atendimento_conducao}
                        onChange={(e) => handleFormChange('atendimento_conducao', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-atendimento_frases_sugeridas">5.3 Frases que gostaria que o atendente usasse (opcional)</Label>
                      <Textarea
                        id="edit-atendimento_frases_sugeridas"
                        placeholder="Ex: 'Quer que eu te envie o link do plano ideal?'&#10;'Deixa eu ver qual opção fica melhor pra você.'"
                        value={formData.atendimento_frases_sugeridas}
                        onChange={(e) => handleFormChange('atendimento_frases_sugeridas', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-atendimento_evitar">5.4 Perguntas ou assuntos que o atendente deve evitar</Label>
                      <Textarea
                        id="edit-atendimento_evitar"
                        placeholder="Ex: Temas sensíveis, política, saúde, finanças pessoais"
                        value={formData.atendimento_evitar}
                        onChange={(e) => handleFormChange('atendimento_evitar', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-atendimento_resposta_padrao_fora_escopo">5.5 Resposta padrão para pedidos fora do escopo</Label>
                      <Textarea
                        id="edit-atendimento_resposta_padrao_fora_escopo"
                        placeholder="Ex: 'Entendi, mas hoje não fazemos esse tipo de serviço. Posso te ajudar a escolher o melhor plano?'"
                        value={formData.atendimento_resposta_padrao_fora_escopo}
                        onChange={(e) => handleFormChange('atendimento_resposta_padrao_fora_escopo', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. INFORMAÇÕES ADICIONAIS */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('informacoes_adicionais')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">6. INFORMAÇÕES ADICIONAIS</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.informacoes_adicionais ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.informacoes_adicionais && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="edit-informacoes_adicionais">
                        6.1 Informações adicionais (opcional)
                      </Label>
                      <Textarea
                        id="edit-informacoes_adicionais"
                        placeholder="Adicione aqui qualquer informação adicional que o agente deve conhecer e usar durante as conversas. Por exemplo: promoções especiais, políticas específicas, informações sobre a equipe, etc."
                        value={formData.informacoes_adicionais}
                        onChange={(e) => handleFormChange('informacoes_adicionais', e.target.value)}
                        rows={6}
                        maxLength={5000}
                        className="border border-slate-300"
                      />
                      <p className={`text-xs ${formData.informacoes_adicionais.length > 5000 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {formData.informacoes_adicionais.length > 5000
                          ? `${formData.informacoes_adicionais.length}/5000 - reduza ${formData.informacoes_adicionais.length - 5000} caracteres`
                          : `${formData.informacoes_adicionais.length}/5000 caracteres`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button variant="outline" onClick={() => {
                setEditingAgent(false)
                resetForm()
                setSelectedAgent(null)
              }}>
                Cancelar
              </Button>
              <Button onClick={updateAgent}>
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button as BaseButton } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Progress } from "./ui/progress"
import { useAuth } from "../hooks/useAuthLaravel"
import { 
  Search, 
  Building2, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Plus,
  FolderOpen,
  List,
  Users,
  Download,
  ArrowLeft,
  Trash2,
  Phone,
  Mail,
  Globe,
  Building,
  X,
  RefreshCw,
  AlertTriangle,
  Hash,
  LayoutGrid,
  LayoutList,
  Filter,
  BarChart3,
  Target,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil
} from "lucide-react"
import { getApiUrl } from "../utils/apiConfig"

// Type assertion for Button with variant and size props
const Button = BaseButton as any

const ESTADOS_BRASIL = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
].sort((a, b) => a.label.localeCompare(b.label))

interface SavedList {
  id: string
  name: string
  description: string
  totalContacts: number
  createdAt: string
  lastUpdated: string
  contacts?: GeneratedContact[]
}

interface GeneratedContact {
  id: string
  name: string
  company: string
  email?: string
  emailSource?: 'real' | 'estimated' | 'none'
  phone?: string
  website?: string
  address: string
  city: string
  state: string
  segment: string
  cnpj?: string
  cep?: string
  neighborhood?: string
  addedAt?: string
  extra_data?: {
    company?: string
    address?: string
    neighborhood?: string
    cep?: string
    cnpj?: string
    segment?: string
    email?: string
  }
}

export function ListGeneratorB2B() {
  const { accessToken } = useAuth()
  
  // Form fields - ordem correta
  const [selectedList, setSelectedList] = useState<string>("")
  const [businessNiche, setBusinessNiche] = useState("")
  const [selectedState, setSelectedState] = useState("")
  const [cities, setCities] = useState<Array<{value: string, label: string}>>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [neighborhoods, setNeighborhoods] = useState("")
  const [targetContactCount, setTargetContactCount] = useState<number>(10)
  
  // Cities search functionality
  const [citySearchTerm, setCitySearchTerm] = useState("")
  
  // Lists management
  const [savedLists, setSavedLists] = useState<SavedList[]>([])
  const [showNewListDialog, setShowNewListDialog] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDescription, setNewListDescription] = useState("")
  
  // Generation results
  const [generatedContacts, setGeneratedContacts] = useState<GeneratedContact[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showListViewer, setShowListViewer] = useState(false)
  const [selectedListToView, setSelectedListToView] = useState<SavedList | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortField, setSortField] = useState<'name' | 'createdAt' | 'totalContacts'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  const [isCreatingList, setIsCreatingList] = useState(false)
  
  // Progress tracking for meta generation
  const [isGeneratingWithMeta, setIsGeneratingWithMeta] = useState(false)
  const [currentContactCount, setCurrentContactCount] = useState(0)
  const [generationAttempts, setGenerationAttempts] = useState(0)
  const [cancelRequested, setCancelRequested] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(180) // 3:00 minutes
  
  // Messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Timer effect for elapsed time display and countdown
  useEffect(() => {
    if (!isGeneratingWithMeta || !generationStartTime) return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - generationStartTime) / 1000)
      setElapsedSeconds(elapsed)
      
      // Update countdown timer (starts at 3:00)
      const remaining = Math.max(0, 180 - elapsed)
      setRemainingSeconds(remaining)
    }, 100)
    
    return () => clearInterval(interval)
  }, [isGeneratingWithMeta, generationStartTime])

  // Edit list states
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingList, setEditingList] = useState<SavedList | null>(null)
  const [editListName, setEditListName] = useState("")
  const [editListDescription, setEditListDescription] = useState("")
  const [isUpdatingList, setIsUpdatingList] = useState(false)

  // Load previous search info state
  const [isLoadingPreviousInfo, setIsLoadingPreviousInfo] = useState(false)

  // Save contacts state - REMOVED: contacts now auto-saved by backend on generation

  const baseUrl = getApiUrl()

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${baseUrl}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`)
        throw new Error(errorText)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filter cities based on search term
  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return cities
    
    return cities.filter(city => 
      city.label.toLowerCase().includes(citySearchTerm.toLowerCase())
    )
  }, [cities, citySearchTerm])

  const testServerConnection = async () => {
    try {
      console.log("🏥 Testing server connection...")
      const response = await fetch(`${baseUrl}/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Server connection successful:", data)
        return true
      } else {
        console.error("❌ Server connection failed:", response.status)
        return false
      }
    } catch (error) {
      console.error("❌ Server connection error:", error)
      return false
    }
  }

  const loadSavedLists = async () => {
    setIsLoadingLists(true)
    setError(null)
    
    try {
      // Test server connection first
      const serverOnline = await testServerConnection()
      if (!serverOnline) {
        throw new Error('Servidor não disponível')
      }
      
      console.log("📋 Loading saved lists from server...")
      console.log("🔑 Auth token available:", accessToken ? "Yes" : "No (using anon key)")
      const data = await apiCall('/lists')
      
      console.log("📊 Server response:", {
        success: !!data,
        listsCount: data.lists?.length || 0,
        debug: data.debug
      })
      
      // Transform API response to component format
      const transformedLists = (data.lists || []).map((list: any) => ({
        id: list.id,
        name: list.name,
        description: list.description || '',
        totalContacts: list.total_contacts || 0,
        createdAt: list.created_at || new Date().toISOString(),
        lastUpdated: list.updated_at || new Date().toISOString(),
        contacts: list.contacts || []
      }))
      
      setSavedLists(transformedLists)
      console.log(`✅ Loaded ${transformedLists.length} lists`)
      
    } catch (error) {
      console.error('❌ Error loading lists:', error)
      
      const errorMsg = (error as Error).message || String(error)
      if (errorMsg.includes('401') || errorMsg.includes('Authorization')) {
        setError('🔐 Sessão expirada. Faça login novamente.')
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('não disponível')) {
        setError('🌐 Servidor não disponível. Tente novamente em alguns momentos.')
      } else {
        setError(`Erro ao carregar listas: ${errorMsg}`)
      }
      
      setSavedLists([])
    } finally {
      setIsLoadingLists(false)
    }
  }

  const loadCities = async (state: string) => {
    setIsLoadingCities(true)
    setError(null)
    setCitySearchTerm("") // Reset search when loading new state
    
    try {
      const data = await apiCall(`/cities/${state}`)
      setCities(data.cities || [])
      console.log(`✅ Loaded ${data.cities?.length || 0} cities for ${state}`)
    } catch (error) {
      console.error('Error loading cities:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao carregar cidades para ${state}`)
      setCities([])
    } finally {
      setIsLoadingCities(false)
    }
  }

  const createNewList = async () => {
    if (!newListName.trim()) {
      setError('Nome da lista é obrigatório')
      return
    }

    setIsCreatingList(true)
    setError(null)

    try {
      console.log("✨ Creating new list:", newListName)
      
      const data = await apiCall('/lists', {
        method: 'POST',
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim()
        })
      })

      if (data.success && data.list) {
        console.log("✅ List created successfully:", data.list)
        
        // Clear form first
        setNewListName("")
        setNewListDescription("")
        setShowNewListDialog(false)
        
        // Reload lists from server to ensure consistency
        await loadSavedLists()
        
        // Select the newly created list
        setSelectedList(data.list.id)
        
        setSuccess(data.message || `Lista "${data.list.name}" criada com sucesso!`)
      } else {
        throw new Error(data.message || 'Erro ao criar lista')
      }
      
    } catch (error) {
      console.error('Error creating list:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao criar lista: ${errorMsg}`)
    } finally {
      setIsCreatingList(false)
    }
  }

  const deleteList = async (listId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      console.log("🗑️ Deleting list:", listId)
      
      const data = await apiCall(`/lists/${listId}`, {
        method: 'DELETE'
      })

      if (data.success) {
        console.log("✅ List deleted successfully")
        
        // Clear selection if deleted list was selected
        if (selectedList === listId) {
          setSelectedList("")
        }
        
        // Reload lists from server to ensure consistency
        await loadSavedLists()
        
        setSuccess(data.message || 'Lista excluída com sucesso!')
      } else {
        throw new Error(data.message || 'Erro ao excluir lista')
      }
      
    } catch (error) {
      console.error('Error deleting list:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao excluir lista: ${errorMsg}`)
    }
  }

  const openEditDialog = (list: SavedList) => {
    setEditingList(list)
    setEditListName(list.name)
    setEditListDescription(list.description || "")
    setShowEditDialog(true)
  }

  const closeEditDialog = () => {
    setShowEditDialog(false)
    setEditingList(null)
    setEditListName("")
    setEditListDescription("")
  }

  const saveListEdit = async () => {
    if (!editingList || !editListName.trim()) {
      setError("O nome da lista é obrigatório")
      return
    }

    setIsUpdatingList(true)
    setError(null)

    try {
      console.log("✏️ Updating list:", editingList.id)
      
      const data = await apiCall(`/lists/${editingList.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editListName.trim(),
          description: editListDescription.trim()
        })
      })

      if (data.success) {
        console.log("✅ List updated successfully")
        
        // Reload lists to show updated data
        await loadSavedLists()
        
        setSuccess(data.message || 'Lista atualizada com sucesso!')
        closeEditDialog()
      } else {
        throw new Error(data.message || 'Erro ao atualizar lista')
      }
      
    } catch (error) {
      console.error('Error updating list:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao atualizar lista: ${errorMsg}`)
    } finally {
      setIsUpdatingList(false)
    }
  }

  // Removed searchContacts function - now only using generateContactsWithMeta

  const generateContactsWithMeta = async () => {
    console.log('🚀 Starting generateContactsWithMeta function')
    
    // Validation
    if (!selectedList) {
      setError('Por favor, selecione uma lista primeiro')
      return
    }
    
    if (!businessNiche.trim()) {
      setError('Por favor, preencha o nicho de negócio')
      return
    }
    
    if (!selectedState) {
      setError('Por favor, selecione um estado')
      return
    }
    
    if (selectedCities.length === 0) {
      setError('Por favor, selecione pelo menos uma cidade')
      return
    }

    if (targetContactCount < 1 || targetContactCount > 99) {
      setError('A quantidade de contatos deve estar entre 1 e 99')
      return
    }

    console.log('✅ All validations passed, starting generation process')

    // Reset all states first
    setIsGeneratingWithMeta(true)
    setCancelRequested(false)
    setError(null)
    setSuccess(null)
    setCurrentContactCount(0)
    setGenerationAttempts(0)
    setElapsedSeconds(0)
    setGenerationStartTime(Date.now())

    // Small delay to ensure state is set
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log(`🎯 Starting meta generation for ${targetContactCount} contacts`)
    console.log(`🔍 Initial state - cancelRequested: ${cancelRequested}`)

    let totalGenerated = 0
    let attempts = 0
    const maxAttempts = 30 // Limite de tentativas - após 30, sugerir ampliar regiões
    let allGeneratedContacts: GeneratedContact[] = []

    try {
      while (totalGenerated < targetContactCount && attempts < maxAttempts && !cancelRequested) {
        attempts++
        setGenerationAttempts(attempts)
        
        console.log(`🔄 Attempt ${attempts}: Generated ${totalGenerated}/${targetContactCount} contacts - cancelRequested: ${cancelRequested}`)

        const requestBody = {
          listId: selectedList,
          businessNiche: businessNiche.trim(),
          state: selectedState,
          cities: selectedCities,
          neighborhoods: neighborhoods.trim(),
          attempt: attempts - 1  // Zero-based index for backend rotation
        }

        try {
          const data = await apiCall('/generate-leads', {
            method: 'POST',
            body: JSON.stringify(requestBody)
          })

          if (data.success && data.contacts && data.contacts.length > 0) {
            // Normalize contacts - merge extra_data into root level
            const normalizedContacts = data.contacts.map(normalizeContact)
            
            // Backend already filters duplicates from the list
            // This is an extra safety layer to filter duplicates within this generation session
            const newContacts = normalizedContacts.filter((newContact: GeneratedContact) => 
              !allGeneratedContacts.some(existing => 
                (existing.cnpj && newContact.cnpj && existing.cnpj === newContact.cnpj) ||
                (existing.company.toLowerCase() === newContact.company.toLowerCase())
              )
            )

            console.log(`📊 Attempt ${attempts}: API returned ${data.contacts.length} contacts, ${newContacts.length} are unique in this session`)

            if (newContacts.length > 0) {
              allGeneratedContacts = [...allGeneratedContacts, ...newContacts]
              totalGenerated = allGeneratedContacts.length
              setCurrentContactCount(totalGenerated)
              
              console.log(`✅ Added ${newContacts.length} new contacts. Total: ${totalGenerated}/${targetContactCount}`)
              
              // Update progress message with warning if approaching limit
              const progressPercent = Math.round(totalGenerated/targetContactCount*100)
              if (attempts >= 15 && totalGenerated < targetContactCount) {
                setSuccess(`🔄 Gerando... ${totalGenerated}/${targetContactCount} (${progressPercent}%) - Busca ${attempts}/${maxAttempts}. 📍 Considere adicionar mais cidades!`)
              } else {
                setSuccess(`🔄 Gerando contatos... ${totalGenerated}/${targetContactCount} (${progressPercent}%) - Busca ${attempts}/${maxAttempts}`)
              }
            } else {
              console.log(`ℹ️ No new unique contacts found in attempt ${attempts} (all were session duplicates)`)
            }
          } else {
            console.log(`⚠️ No contacts returned in attempt ${attempts}`)
          }

          // Wait between attempts to respect API limits
          if (totalGenerated < targetContactCount && attempts < maxAttempts && !cancelRequested) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
          }

        } catch (error) {
          console.error(`❌ Error in attempt ${attempts}:`, error)
          
          // Convert error to string for checking
          const errorString = (error as Error).message || JSON.stringify(error)
          
          // Check if it's a rate limit error or API unavailable error
          if (typeof errorString === 'string' && (errorString.includes('429') || 
              errorString.includes('Limite de requisições atingido') ||
              errorString.includes('APIs de dados indisponíveis'))) {
            console.log('⏰ Rate limit or API unavailable - stopping generation')
            
            if (errorString.includes('APIs de dados indisponíveis')) {
              setError('⚠️ Serviço de dados temporariamente indisponível. Por favor, tente novamente em alguns minutos.')
            } else {
              setError('⏰ Limite de requisições atingido. Por favor, aguarde alguns minutos antes de tentar novamente.')
            }
            break // Stop the loop completely
          } else if (typeof errorString === 'string' && errorString.includes('Failed to fetch')) {
            console.log('🌐 Connection error, waiting...')
            await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay for connection issues
          } else {
            // For other errors, continue but wait a bit
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }

      if (cancelRequested) {
        // Save and show the contacts that were already generated
        if (allGeneratedContacts.length > 0) {
          setGeneratedContacts(allGeneratedContacts)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setSuccess(`⏹️ Geração cancelada! ${allGeneratedContacts.length} contatos foram extraídos e salvos na lista.`)
          console.log(`⏹️ Generation cancelled. ${allGeneratedContacts.length} contacts saved.`)
        } else {
          setError('❌ Geração cancelada pelo usuário. Nenhum contato foi extraído.')
          console.log('⏹️ Generation cancelled. No contacts extracted.')
        }
        return
      }

      if (totalGenerated >= targetContactCount) {
        const finalContacts = allGeneratedContacts.slice(0, targetContactCount)
        setGeneratedContacts(finalContacts)
        setShowResults(true)
        
        // Reload lists to get updated contact counts from server
        setTimeout(() => loadSavedLists(), 1000)
        
        const emailsFound = finalContacts.filter(c => c.email && c.email.length > 0).length
        const successMsg = emailsFound > 0 
          ? `🎉 Meta atingida! ${targetContactCount} contatos encontrados (${emailsFound} com email)!`
          : `🎉 Meta atingida! ${targetContactCount} contatos reais gerados!`
        
        setSuccess(successMsg)
        console.log(`🎉 Meta completed: ${targetContactCount} contacts generated in ${attempts} attempts (${emailsFound} with email)`)
      } else if (attempts >= maxAttempts) {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedContacts)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setError(`⚠️ Limite de ${maxAttempts} buscas atingido! ${totalGenerated} de ${targetContactCount} contatos gerados. 📍 Para encontrar mais contatos, selecione mais cidades ou experimente outro estado.`)
        } else {
          setError('❌ Nenhum contato encontrado após 20 buscas. 📍 AMPLIE SUA REGIÃO: Selecione mais cidades, outros estados ou use termos de busca mais genéricos.')
        }
      } else {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedContacts)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setSuccess(`⚠️ Geração interrompida. ${totalGenerated} contatos encontrados de ${targetContactCount} solicitados.`)
        } else {
          setError('❌ Nenhum contato encontrado. Verifique os critérios de busca.')
        }
      }

    } catch (error) {
      console.error('❌ Critical error in meta generation:', error)
      setError(`❌ Erro crítico na geração: ${(error as Error).message || String(error)}`)
    } finally {
      setIsGeneratingWithMeta(false)
      setCancelRequested(false)
      setGenerationStartTime(null)
      setElapsedSeconds(0)
    }
  }

  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    // Add country code if not present
    const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
    return `https://wa.me/${withCountry}`
  }

  // Normalize contact data - merges extra_data fields into root level
  const normalizeContact = (contact: GeneratedContact): GeneratedContact => {
    if (!contact.extra_data) return contact
    
    return {
      ...contact,
      // Use extra_data if root level fields are missing
      company: contact.company || contact.extra_data?.company || contact.name,
      address: contact.address || contact.extra_data?.address || '',
      neighborhood: contact.neighborhood || contact.extra_data?.neighborhood || '',
      cep: contact.cep || contact.extra_data?.cep || '',
      cnpj: contact.cnpj || contact.extra_data?.cnpj || '',
      segment: contact.segment || contact.extra_data?.segment || '',
      email: contact.email || contact.extra_data?.email || ''
    }
  }

  const cancelGeneration = () => {
    // Set flag to stop generation loop
    // The loop checks !cancelRequested condition and will exit on next iteration
    // Already extracted contacts will be saved and displayed
    setCancelRequested(true)
    setError(null)
    setSuccess('⏹️ Parando geração de contatos...')
  }

  // REMOVED: saveContactsToList - contacts are now auto-saved by backend during generateLeads call
  // When generateLeads is called, it immediately saves all contacts to the database and returns them
  // No manual save step needed anymore

  const handleCityToggle = (cityValue: string, checked: boolean) => {
    if (checked) {
      setSelectedCities([...selectedCities, cityValue])
    } else {
      setSelectedCities(selectedCities.filter(city => city !== cityValue))
    }
  }

  const removeSelectedCity = (cityValue: string) => {
    setSelectedCities(selectedCities.filter(city => city !== cityValue))
  }

  const exportToCSV = (contactsToExport?: GeneratedContact[], listName?: string) => {
    const contacts = (contactsToExport || generatedContacts).map(normalizeContact)
    
    if (contacts.length === 0) {
      setError('Nenhum contato para exportar')
      return
    }
    
    const csvContent = [
      ['Empresa', 'Email', 'Telefone', 'Website', 'Endereço', 'Cidade', 'Estado', 'Bairro', 'CEP', 'Segmento'].join(','),
      ...contacts.map(contact => [
        contact.company || '',
        contact.email || '',
        contact.phone || '',
        contact.website || '',
        contact.address || '',
        contact.city || '',
        contact.state || '',
        contact.neighborhood || '',
        contact.cep || '',
        contact.segment || ''
      ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    const fileName = listName 
      ? `${listName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      : `contatos_b2b_${selectedList}_${new Date().toISOString().split('T')[0]}.csv`
    
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccess(`📁 ${contacts.length} contatos exportados com sucesso!`)
  }

  const refreshLists = () => {
    loadSavedLists()
  }

  const loadPreviousSearchInfo = async () => {
    if (!selectedList) {
      setError('Por favor, selecione uma lista primeiro')
      return
    }

    setIsLoadingPreviousInfo(true)
    setError(null)

    try {
      console.log("📋 Loading previous search info for list:", selectedList)
      const data = await apiCall(`/lists/${selectedList}/previous-search`)
      
      if (data.success && data.searchInfo) {
        const info = data.searchInfo
        
        // Load the previous search parameters
        if (info.businessNiche) {
          setBusinessNiche(info.businessNiche)
          console.log("✅ Loaded business niche:", info.businessNiche)
        }
        
        if (info.state) {
          setSelectedState(info.state)
          console.log("✅ Loaded state:", info.state)
        }
        
        if (info.cities && Array.isArray(info.cities)) {
          setSelectedCities(info.cities)
          console.log("✅ Loaded cities:", info.cities)
        }
        
        if (info.neighborhoods) {
          setNeighborhoods(info.neighborhoods)
          console.log("✅ Loaded neighborhoods:", info.neighborhoods)
        }
        
        if (info.targetContactCount) {
          setTargetContactCount(info.targetContactCount)
          console.log("✅ Loaded target contact count:", info.targetContactCount)
        }

        setSuccess('✅ Informações anteriores carregadas com sucesso!')
      } else {
        setError('Nenhuma busca anterior encontrada para esta lista')
      }
    } catch (error) {
      console.error('Error loading previous search info:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao carregar informações anteriores: ${errorMsg}`)
    } finally {
      setIsLoadingPreviousInfo(false)
    }
  }

  const loadListContacts = async (listId: string) => {
    setError(null)
    
    try {
      console.log("📊 Loading contacts for list:", listId)
      const data = await apiCall(`/lists/${listId}/contacts`)
      
      if (data.success) {
        setSelectedListToView({
          ...data.list,
          contacts: data.contacts || []
        })
        setShowListViewer(true)
        console.log(`✅ Loaded ${data.contacts?.length || 0} contacts`)
      } else {
        throw new Error(data.message || 'Erro ao carregar contatos')
      }
      
    } catch (error) {
      console.error('Error loading list contacts:', error)
      const errorMsg = (error as Error).message || String(error)
      setError(`Erro ao carregar contatos: ${errorMsg}`)
    }
  }

  useEffect(() => {
    if (accessToken) {
      console.log("🔑 Access token available, loading lists...")
      loadSavedLists()
    } else {
      console.log("⚠️ No access token, clearing lists")
      setSavedLists([])
      setSelectedList("")
    }
  }, [accessToken])

  useEffect(() => {
    if (selectedState && accessToken) {
      loadCities(selectedState)
    } else {
      setCities([])
      setSelectedCities([])
    }
  }, [selectedState, accessToken])

  // Reset generation states when form changes
  useEffect(() => {
    if (isGeneratingWithMeta) {
      setIsGeneratingWithMeta(false)
      setCancelRequested(false)
      setCurrentContactCount(0)
      setGenerationAttempts(0)
    }
  }, [selectedList, businessNiche, selectedState, selectedCities, neighborhoods, targetContactCount])

  // Sort function
  const handleSort = (field: 'name' | 'createdAt' | 'totalContacts') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sorted lists
  const sortedLists = useMemo(() => {
    const sorted = [...savedLists].sort((a, b) => {
      let comparison = 0
      
      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '')
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      } else if (sortField === 'totalContacts') {
        comparison = (a.totalContacts || 0) - (b.totalContacts || 0)
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [savedLists, sortField, sortDirection])

  // Alphabetically sorted lists for dropdown in generator
  const alphabeticallySortedLists = useMemo(() => {
    return [...savedLists].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    )
  }, [savedLists])

  // List Viewer
  if (showListViewer && !selectedListToView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={() => setShowListViewer(false)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl">Suas Listas B2B</h1>
                <p className="text-sm text-muted-foreground">
                  {savedLists.length} listas criadas
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* View Mode Toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <LayoutList className="w-4 h-4" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
              </div>
              
              <Button onClick={refreshLists} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              
              <Button onClick={() => setShowNewListDialog(true)} variant="default" className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Lista</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </div>
          </div>

          {/* Lists Display */}
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedLists.map((list) => (
                <Card key={list.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">{list.name}</h3>
                        {list.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            {list.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs sm:text-sm">{list.totalContacts || 0} contatos</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(list.createdAt).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => loadListContacts(list.id)}
                          size="sm"
                          className="flex-1"
                          disabled={!list.totalContacts}
                        >
                          Ver Contatos
                        </Button>
                        <Button 
                          onClick={() => openEditDialog(list)}
                          size="sm"
                          variant="outline"
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => deleteList(list.id)}
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center gap-2">
                            Data de Criação
                            {sortField === 'createdAt' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Nome da Lista
                            {sortField === 'name' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium hidden md:table-cell">Descrição</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => handleSort('totalContacts')}
                        >
                          <div className="flex items-center gap-2">
                            Contatos
                            {sortField === 'totalContacts' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedLists.map((list) => (
                        <tr key={list.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4">
                            <span className="text-sm text-muted-foreground">
                              {new Date(list.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm">{list.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {list.description || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{list.totalContacts || 0}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                onClick={() => loadListContacts(list.id)}
                                size="sm"
                                disabled={!list.totalContacts}
                              >
                                Ver
                              </Button>
                              <Button 
                                onClick={() => openEditDialog(list)}
                                size="sm"
                                variant="outline"
                                className="text-primary hover:text-primary"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                onClick={() => deleteList(list.id)}
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {savedLists.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhuma lista criada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira lista para organizar contatos B2B
              </p>
              <Button onClick={() => setShowListViewer(false)}>
                Criar Lista
              </Button>
            </div>
          )}
        </div>
        
        {/* Dialog para Nova Lista */}
        <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Lista</DialogTitle>
              <DialogDescription>
                Crie uma nova lista para organizar seus contatos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-list-name-viewer">Nome da Lista*</Label>
                <Input
                  id="new-list-name-viewer"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ex: Restaurantes SP"
                  disabled={isCreatingList}
                />
              </div>
              <div>
                <Label htmlFor="new-list-description-viewer">Descrição</Label>
                <Input
                  id="new-list-description-viewer"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Ex: Lista de restaurantes em São Paulo"
                  disabled={isCreatingList}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createNewList}
                disabled={isCreatingList || !newListName.trim()}
                className="flex-1"
              >
                {isCreatingList ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Lista'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewListDialog(false)
                  setNewListName("")
                  setNewListDescription("")
                }}
                disabled={isCreatingList}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para Editar Lista */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Lista</DialogTitle>
              <DialogDescription>
                Atualize o nome e a descrição da lista
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-list-name">Nome da Lista*</Label>
                <Input
                  id="edit-list-name"
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  placeholder="Ex: Restaurantes SP"
                  disabled={isUpdatingList}
                />
              </div>
              <div>
                <Label htmlFor="edit-list-description">Descrição</Label>
                <Input
                  id="edit-list-description"
                  value={editListDescription}
                  onChange={(e) => setEditListDescription(e.target.value)}
                  placeholder="Ex: Lista de restaurantes em São Paulo"
                  disabled={isUpdatingList}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={saveListEdit}
                disabled={isUpdatingList || !editListName.trim()}
                className="flex-1"
              >
                {isUpdatingList ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={closeEditDialog}
                disabled={isUpdatingList}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // List Details View
  if (showListViewer && selectedListToView) {
    const contacts = selectedListToView.contacts || []
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedListToView(null)
                  setShowListViewer(true)
                }}
                className="gap-2 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl truncate">{selectedListToView.name}</h1>
                {selectedListToView.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedListToView.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {contacts.length > 0 && (
                <Button onClick={() => exportToCSV(contacts, selectedListToView.name)} variant="outline" className="gap-2 flex-1 sm:flex-initial">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">Exportar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                    <p className="text-lg sm:text-2xl truncate">{contacts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Emails</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.email).length}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                        {contacts.filter(c => c.emailSource === 'real').length} ✓
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                        {contacts.filter(c => c.emailSource === 'estimated').length} ~
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Com Telefone</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.phone).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Com Website</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.website).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Table */}
          {contacts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Contatos ({contacts.length})</CardTitle>
                <CardDescription>
                  Lista completa de empresas encontradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-3 sm:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap">Empresa</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap">Email</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap">Telefone</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap hidden lg:table-cell">Website</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap hidden xl:table-cell">Endereço</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap hidden md:table-cell">Cidade</th>
                          <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs whitespace-nowrap hidden lg:table-cell">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-background">
                        {contacts.map((rawContact) => {
                          const contact = normalizeContact(rawContact)
                          return (
                          <tr key={contact.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 max-w-xs">
                                  <p className="text-xs sm:text-sm font-medium truncate">
                                    {contact.company}
                                  </p>
                                  {contact.segment && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {contact.segment}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              {contact.email ? (
                                <div className="flex flex-col gap-1">
                                  <a 
                                    href={`mailto:${contact.email}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm text-blue-600 hover:underline truncate block max-w-[150px] sm:max-w-none"
                                  >
                                    {contact.email}
                                  </a>
                                  {contact.emailSource === 'estimated' && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs w-fit bg-amber-50 text-amber-700 border-amber-300"
                                      title="Email estimado - recomendamos validar antes de usar"
                                    >
                                      Estimado
                                    </Badge>
                                  )}
                                  {contact.emailSource === 'real' && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs w-fit bg-green-50 text-green-700 border-green-300"
                                      title="Email encontrado na fonte de dados"
                                    >
                                      Verificado
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              {contact.phone ? (
                                <a 
                                  href={formatPhoneForWhatsApp(contact.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs sm:text-sm text-vai-green-ai hover:underline whitespace-nowrap"
                                  title="Abrir no WhatsApp"
                                >
                                  {contact.phone}
                                </a>
                              ) : (
                                <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 hidden lg:table-cell">
                              {contact.website ? (
                                <a 
                                  href={contact.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs sm:text-sm text-blue-600 hover:underline truncate block max-w-[200px]"
                                >
                                  {contact.website}
                                </a>
                              ) : (
                                <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 hidden xl:table-cell">
                              <div className="text-xs sm:text-sm">
                                <p className="truncate max-w-[200px]">{contact.address}</p>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
                              <div className="text-xs sm:text-sm">
                                <p className="truncate max-w-[150px]">{contact.city}</p>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 hidden lg:table-cell">
                              <div className="text-xs sm:text-sm">
                                <p className="text-muted-foreground">{contact.state}</p>
                              </div>
                            </td>
                          </tr>
                        )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum contato ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Use o gerador para adicionar contatos a esta lista
                </p>
                <Button onClick={() => {
                  setSelectedListToView(null)
                  setShowListViewer(false)
                }}>
                  Gerar Contatos
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Main Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl">Gerador de Listas B2B</h1>
            <p className="text-sm text-muted-foreground">
              Encontre empresas com dados reais e atualizados
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowListViewer(true)} 
              variant="default"
              size="default"
              className="gap-2 flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Ver Minhas Listas</span>
              {savedLists.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                  {savedLists.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {(error.includes('Configure') || error.includes('API') || error.includes('Inscreva-se')) && (
                <div className="mt-2 text-xs">
                  <strong>💡 Dica:</strong> Consulte o arquivo <code className="bg-black/10 px-1 py-0.5 rounded">RAPIDAPI_SETUP.md</code> para instruções detalhadas de configuração.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* List Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                  Selecionar Lista
                </CardTitle>
                <CardDescription>
                  Escolha uma lista existente ou crie uma nova
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 max-w-md">
                    <Label htmlFor="list-select">Lista de Destino</Label>
                    <Select value={selectedList} onValueChange={setSelectedList}>
                      <SelectTrigger id="list-select" disabled={isLoadingLists}>
                        <SelectValue placeholder={isLoadingLists ? "Carregando..." : "Selecione uma lista"} />
                      </SelectTrigger>
                      <SelectContent>
                        {alphabeticallySortedLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.totalContacts || 0} contatos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex-shrink-0">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Nova Lista
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Nova Lista</DialogTitle>
                        <DialogDescription>
                          Crie uma nova lista para organizar seus contatos
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="new-list-name">Nome da Lista*</Label>
                          <Input
                            id="new-list-name"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="Ex: Restaurantes SP"
                            disabled={isCreatingList}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-list-description">Descrição</Label>
                          <Input
                            id="new-list-description"
                            value={newListDescription}
                            onChange={(e) => setNewListDescription(e.target.value)}
                            placeholder="Ex: Lista de restaurantes em São Paulo"
                            disabled={isCreatingList}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={createNewList}
                          disabled={isCreatingList || !newListName.trim()}
                          className="flex-1"
                        >
                          {isCreatingList ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Criar Lista'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewListDialog(false)
                            setNewListName("")
                            setNewListDescription("")
                          }}
                          disabled={isCreatingList}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Search Criteria */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  Critérios de Busca
                </CardTitle>
                <CardDescription>
                  Defina os parâmetros para encontrar empresas. O sistema extrairá automaticamente emails dos websites encontrados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedList && (
                  <Button
                    onClick={loadPreviousSearchInfo}
                    disabled={isLoadingPreviousInfo}
                    variant="outline"
                    className="w-full gap-2 mb-2"
                  >
                    {isLoadingPreviousInfo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4" />
                        Carregar Informações Anteriores
                      </>
                    )}
                  </Button>
                )}

                <div>
                  <Label htmlFor="niche">Nicho de Negócio*</Label>
                  <Input
                    id="niche"
                    value={businessNiche}
                    onChange={(e) => setBusinessNiche(e.target.value)}
                    placeholder="Ex: Restaurantes, Academias, Lojas de Roupas"
                  />
                </div>

                <div>
                  <Label htmlFor="state">Estado*</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cidades* (múltipla seleção)</Label>
                  {!selectedState && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Selecione um estado acima para carregar as cidades disponíveis
                    </p>
                  )}
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Buscar cidade..."
                      value={citySearchTerm}
                      onChange={(e) => setCitySearchTerm(e.target.value)}
                      className="mb-2"
                      disabled={!selectedState}
                    />
                    
                    {selectedCities.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                        {selectedCities.map((cityValue) => {
                          const city = cities.find(c => c.value === cityValue)
                          return (
                            <Badge key={cityValue} variant="secondary" className="gap-2">
                              {city?.label}
                              <button
                                onClick={() => removeSelectedCity(cityValue)}
                                className="hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}

                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {!selectedState ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Selecione um estado para ver as cidades disponíveis
                        </div>
                      ) : isLoadingCities ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Carregando cidades...
                        </div>
                      ) : filteredCities.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {filteredCities.map((city) => (
                            <label
                              key={city.value}
                              className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCities.includes(city.value)}
                                onChange={(e) => handleCityToggle(city.value, e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm">{city.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          {citySearchTerm ? 'Nenhuma cidade encontrada' : 'Nenhuma cidade disponível'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="neighborhoods">Bairros (opcional)</Label>
                  <Input
                    id="neighborhoods"
                    value={neighborhoods}
                    onChange={(e) => setNeighborhoods(e.target.value)}
                    placeholder="Ex: Centro, Jardins, Moema"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separe múltiplos bairros por vírgula
                  </p>
                </div>

                <div>
                  <Label htmlFor="contact-count">Quantidade de Contatos*</Label>
                  <Input
                    id="contact-count"
                    type="number"
                    min="1"
                    max="99"
                    value={targetContactCount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setTargetContactCount('' as any)
                      } else {
                        const num = parseInt(value)
                        if (!isNaN(num)) {
                          setTargetContactCount(Math.min(99, Math.max(1, num)))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setTargetContactCount(10)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo: 1 | Máximo: 99
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <div className="flex gap-2">
              {!isGeneratingWithMeta ? (
                <Button
                  onClick={generateContactsWithMeta}
                  disabled={isLoading || isGeneratingWithMeta || !selectedList || !businessNiche || !selectedState || selectedCities.length === 0}
                  className="flex-1 gap-2"
                  size="lg"
                  variant="default"
                >
                  <Search className="w-5 h-5" />
                  Gerar Lista de Contatos
                </Button>
              ) : (
                <Button
                  onClick={cancelGeneration}
                  variant="destructive"
                  className="flex-1 gap-2"
                  size="lg"
                >
                  Cancelar Geração
                </Button>
              )}
            </div>

            {/* Meta Generation Progress */}
            {isGeneratingWithMeta && (
              <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="font-medium">Gerando contatos...</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">
                        ⏱️ {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progresso</span>
                        <span className="font-medium">
                          {currentContactCount} / {targetContactCount} contatos
                        </span>
                      </div>
                      <Progress value={(currentContactCount / targetContactCount) * 100} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este processo pode levar alguns minutos. Aguarde enquanto buscamos os melhores contatos para você.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {showResults && generatedContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Resultados da Busca</CardTitle>
                      <CardDescription>
                        {generatedContacts.length} empresas encontradas
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-initial">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          <div className="text-xs sm:text-sm">
                            <p className="font-semibold text-green-800">{generatedContacts.length} contatos salvos!</p>
                            <p className="text-green-700">Salvos automaticamente na sua lista</p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => exportToCSV(generatedContacts, 'resultados_busca')} variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar CSV</span>
                        <span className="sm:hidden">CSV</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedContacts.slice(0, 5).map((rawContact) => {
                      const contact = normalizeContact(rawContact)
                      return (
                        <div key={contact.id} className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div>
                                <p className="font-semibold text-sm sm:text-base truncate">{contact.company}</p>
                                {contact.segment && (
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{contact.segment}</p>
                                )}
                              </div>
                              <div className="grid gap-1 text-xs sm:text-sm">
                                {contact.email && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                      <a 
                                        href={`mailto:${contact.email}`} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate"
                                      >
                                        {contact.email}
                                      </a>
                                    </div>
                                    {contact.emailSource === 'estimated' && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                                        title="Email estimado - recomendamos validar antes de usar"
                                      >
                                        Estimado
                                      </Badge>
                                    )}
                                    {contact.emailSource === 'real' && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs bg-green-50 text-green-700 border-green-300"
                                        title="Email encontrado na fonte de dados"
                                      >
                                        Verificado
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                    <a 
                                      href={formatPhoneForWhatsApp(contact.phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-vai-green-ai hover:underline"
                                      title="Abrir no WhatsApp"
                                    >
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                                {contact.address && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground truncate">
                                      {contact.address}, {contact.city} - {contact.state}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {generatedContacts.length > 5 && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
                        E mais {generatedContacts.length - 5} contatos. Use "Ver Listas" para visualizar todos.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span className="text-xs sm:text-sm">Listas Criadas</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold">{savedLists.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span className="text-xs sm:text-sm">Total de Contatos</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold">
                    {savedLists.reduce((acc, list) => acc + (list.totalContacts || 0), 0)}
                  </span>
                </div>

                {selectedList && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <span className="text-xs sm:text-sm">Lista Selecionada</span>
                    </div>
                    <span className="text-base sm:text-lg font-semibold">
                      {savedLists.find(l => l.id === selectedList)?.totalContacts || 0}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Dicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <p>
                  🤖 <strong>Geração Inteligente:</strong> O sistema permite gerar até 999 contatos por vez, fazendo buscas inteligentes para encontrar os melhores resultados.
                </p>
                <p>
                  📧 <strong>Emails Estimados:</strong> Emails marcados como "Estimado" foram gerados baseados no website. Recomendamos validar antes de usar.
                </p>
                <p>
                  📍 <strong>Múltiplas Cidades:</strong> Selecione várias cidades para ampliar sua busca. Se atingir o limite de 20 tentativas, adicione mais regiões!
                </p>
                <p>
                  🔍 <strong>Nicho Específico:</strong> Quanto mais específico o nicho, melhores e mais relevantes serão os resultados.
                </p>
                <p>
                  🎯 <strong>Dados Reais:</strong> Todos os contatos são coletados de fontes públicas em tempo real.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

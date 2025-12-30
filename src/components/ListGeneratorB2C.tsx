import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Progress } from "./ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ErrorModal } from "./ErrorModal"
import { useAuth } from "../hooks/useAuthLaravel"
import { formatNumber } from "../utils/formatters"
import { getApiUrl } from "../utils/apiConfig"
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Target,
  Filter,
  Plus,
  FolderOpen,
  List,
  Users,
  Download,
  ArrowLeft,
  Trash2,
  Mail,
  Globe,
  Phone,
  X,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  BarChart3,
  Instagram,
  Linkedin,
  UserCircle,
  MapPin,
  Hash,
  Link,
  LayoutGrid,
  LayoutList,
  MessageCircle
} from "lucide-react"

interface SavedList {
  id: string
  name: string
  description: string
  totalContacts: number
  createdAt: string
  lastUpdated: string
  type?: 'b2c'
  contacts?: SocialContact[]
}

interface SocialContact {
  id: string
  name: string
  username: string
  platform: 'instagram' | 'linkedin'
  profileUrl: string
  bio?: string
  followers?: number
  following?: number
  posts?: number
  email?: string
  location?: string
  website?: string
  verified?: boolean
  category?: string
  addedAt?: string
  extracted_from?: string
  source_profile?: string
}

export function ListGeneratorB2C() {
  const { accessToken } = useAuth()
  
  // Form fields
  const [selectedList, setSelectedList] = useState<string>("")
  const [extractionMode, setExtractionMode] = useState<'by-niche' | 'by-followers'>('by-niche')
  const [platform, setPlatform] = useState<'instagram' | 'linkedin'>('instagram')
  const [searchKeyword, setSearchKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [location, setLocation] = useState("")
  const [minFollowers, setMinFollowers] = useState<number>(0)
  const [maxFollowers, setMaxFollowers] = useState<number>(0)
  const [targetContactCount, setTargetContactCount] = useState<number>(20)
  
  // Follower extraction fields
  const [followerLink1, setFollowerLink1] = useState("")
  const [followerLink2, setFollowerLink2] = useState("")
  const [followerLink3, setFollowerLink3] = useState("")
  
  // LinkedIn specific fields - Obrigatórios
  const [jobTitle, setJobTitle] = useState("")
  const [jobFunction, setJobFunction] = useState("")
  
  // LinkedIn specific fields - Opcionais: Critérios de Pessoas
  const [yearsInPosition, setYearsInPosition] = useState("")
  const [yearsInCompany, setYearsInCompany] = useState("")
  const [seniorityLevel, setSeniorityLevel] = useState("")
  const [linkedinLocation, setLinkedinLocation] = useState("")
  const [companySector, setCompanySector] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [companyType, setCompanyType] = useState("")
  const [recentJobChange, setRecentJobChange] = useState(false)
  const [viewedProfile, setViewedProfile] = useState(false)
  const [postedRecently, setPostedRecently] = useState(false)
  const [followsCompany, setFollowsCompany] = useState(false)
  const [inGroups, setInGroups] = useState("")
  const [firstDegreeConnections, setFirstDegreeConnections] = useState(false)
  const [sharedConnections, setSharedConnections] = useState(false)
  const [inAccountList, setInAccountList] = useState(false)
  const [educationInstitution, setEducationInstitution] = useState("")
  const [totalExperienceYears, setTotalExperienceYears] = useState("")
  const [previousCompany, setPreviousCompany] = useState("")
  
  // LinkedIn specific fields - Opcionais: Critérios de Contas
  const [annualRevenue, setAnnualRevenue] = useState("")
  const [employeeCount, setEmployeeCount] = useState("")
  const [employeeGrowth, setEmployeeGrowth] = useState("")
  const [companyHeadquarters, setCompanyHeadquarters] = useState("")
  const [industrySector, setIndustrySector] = useState("")
  const [leadershipChanges, setLeadershipChanges] = useState(false)
  const [fundingRounds, setFundingRounds] = useState(false)
  
  // Lists management
  const [savedLists, setSavedLists] = useState<SavedList[]>([])
  const [showNewListDialog, setShowNewListDialog] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDescription, setNewListDescription] = useState("")
  
  // Generation results
  const [generatedContacts, setGeneratedContacts] = useState<SocialContact[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showListViewer, setShowListViewer] = useState(false)
  const [selectedListToView, setSelectedListToView] = useState<SavedList | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  const [isCreatingList, setIsCreatingList] = useState(false)
  
  // Progress tracking
  const [isGeneratingWithMeta, setIsGeneratingWithMeta] = useState(false)
  const [currentContactCount, setCurrentContactCount] = useState(0)
  const [generationAttempts, setGenerationAttempts] = useState(0)
  const [cancelRequested, setCancelRequested] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
  
  // Messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Limit exceeded error modal
  const [showLimitError, setShowLimitError] = useState(false)
  const [limitErrorData, setLimitErrorData] = useState<any>(null)

  const baseUrl = getApiUrl()

  // Timer effect for elapsed time display
  useEffect(() => {
    if (!isGeneratingWithMeta || !generationStartTime) return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - generationStartTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 100)
    
    return () => clearInterval(interval)
  }, [isGeneratingWithMeta, generationStartTime])

  // Helper function to format phone number for WhatsApp
  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // If doesn't start with country code, add Brazil's code (55)
    const withCountryCode = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
    
    return `https://wa.me/${withCountryCode}`
  }

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${baseUrl}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`)
        
        // Try to parse as JSON to get better error details
        try {
          const errorData = JSON.parse(errorText)
          const error: any = new Error(errorData.message || errorData.details || errorData.error || errorText)
          error.status = response.status
          error.errorData = errorData
          throw error
        } catch (e: any) {
          const error: any = new Error(errorText)
          error.status = response.status
          throw error
        }
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

  const loadSavedLists = async () => {
    setIsLoadingLists(true)
    setError(null)
    
    try {
      console.log("📋 Loading B2C lists from server...")
      console.log("🔑 Auth token available:", accessToken ? "Yes" : "No (using anon key)")
      const data = await apiCall('/lists')
      
      console.log("📊 Server response:", {
        success: !!data,
        listsCount: data.lists?.length || 0
      })
      
      // Transform API response to match SavedList interface
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
      console.log(`✅ Loaded ${transformedLists.length} B2C lists`)
      
    } catch (error) {
      console.error('❌ Error loading B2C lists:', error)
      
      if (error.message.includes('401') || error.message.includes('Authorization')) {
        setError('🔐 Sessão expirada. Faça login novamente.')
      } else if (error.message.includes('Failed to fetch')) {
        setError('🌐 Servidor não disponível. Tente novamente em alguns momentos.')
      } else {
        setError(`Erro ao carregar listas: ${error.message}`)
      }
      
      setSavedLists([])
    } finally {
      setIsLoadingLists(false)
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
      console.log("✨ Creating new B2C list:", newListName)
      
      const data = await apiCall('/lists', {
        method: 'POST',
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim(),
          type: 'b2c'
        })
      })

      if (data.success && data.list) {
        console.log("✅ B2C List created successfully:", data.list)
        
        setNewListName("")
        setNewListDescription("")
        setShowNewListDialog(false)
        
        await loadSavedLists()
        setSelectedList(data.list.id)
        
        setSuccess(data.message || `Lista "${data.list.name}" criada com sucesso!`)
      } else {
        throw new Error(data.message || 'Erro ao criar lista')
      }
      
    } catch (error: any) {
      console.error('Error creating B2C list:', error)
      
      // Check if it's a limit exceeded error (403 status)
      if (error.status === 403 && error.errorData && error.errorData.error === 'LIMIT_EXCEEDED') {
        setLimitErrorData(error.errorData)
        setShowLimitError(true)
        setShowNewListDialog(false)
        return
      }
      
      setError(`Erro ao criar lista: ${error.message}`)
    } finally {
      setIsCreatingList(false)
    }
  }

  const deleteList = async (listId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      console.log("🗑️ Deleting B2C list:", listId)
      
      const data = await apiCall(`/lists/${listId}`, {
        method: 'DELETE'
      })

      if (data.success) {
        console.log("✅ B2C List deleted successfully")
        
        if (selectedList === listId) {
          setSelectedList("")
        }
        
        await loadSavedLists()
        setSuccess(data.message || 'Lista excluída com sucesso!')
      } else {
        throw new Error(data.message || 'Erro ao excluir lista')
      }
      
    } catch (error) {
      console.error('Error deleting B2C list:', error)
      setError(`Erro ao excluir lista: ${error.message}`)
    }
  }

  const searchSocialProfiles = async () => {
    if (!selectedList) {
      setError('Por favor, selecione uma lista primeiro')
      return
    }
    
    // Validation for extraction mode
    if (extractionMode === 'by-followers') {
      if (!followerLink1.trim()) {
        setError('Por favor, forneça pelo menos um link de perfil')
        return
      }
      
      // Validate URL format
      const urlPattern = /^https?:\/\/(www\.)?(instagram\.com|linkedin\.com)\/.+/i
      if (!urlPattern.test(followerLink1.trim())) {
        setError('Por favor, forneça um link válido do Instagram ou LinkedIn')
        return
      }
      
      if (followerLink2.trim() && !urlPattern.test(followerLink2.trim())) {
        setError('Link 2 inválido. Use um link do Instagram ou LinkedIn')
        return
      }
      
      if (followerLink3.trim() && !urlPattern.test(followerLink3.trim())) {
        setError('Link 3 inválido. Use um link do Instagram ou LinkedIn')
        return
      }
    } else {
      // Validation for Instagram
      if (platform === 'instagram' && !searchKeyword.trim()) {
        setError('Por favor, preencha a palavra-chave de busca')
        return
      }

      // Validation for LinkedIn
      if (platform === 'linkedin') {
        if (!jobTitle.trim() || !jobFunction.trim()) {
          setError('Por favor, preencha Cargo e Função (campos obrigatórios)')
          return
        }
      }
    }

    if (targetContactCount < 1 || targetContactCount > 999) {
      setError('A quantidade de perfis deve estar entre 1 e 999')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const requestBody: any = {
        listId: selectedList,
        extractionMode
      }
      
      // By followers mode
      if (extractionMode === 'by-followers') {
        const links = [followerLink1.trim(), followerLink2.trim(), followerLink3.trim()].filter(Boolean)
        requestBody.followerLinks = links
      } else {
        // By niche mode
        requestBody.platform = platform
      }

      // Instagram fields
      if (platform === 'instagram') {
        requestBody.keyword = searchKeyword.trim()
        requestBody.category = category.trim()
        requestBody.location = location.trim()
        requestBody.minFollowers = minFollowers || undefined
        requestBody.maxFollowers = maxFollowers || undefined
      }

      // LinkedIn fields
      if (platform === 'linkedin') {
        requestBody.jobTitle = jobTitle.trim()
        requestBody.jobFunction = jobFunction.trim()
        requestBody.yearsInPosition = yearsInPosition.trim()
        requestBody.yearsInCompany = yearsInCompany.trim()
        requestBody.seniorityLevel = seniorityLevel
        requestBody.location = linkedinLocation.trim()
        requestBody.companySector = companySector.trim()
        requestBody.companySize = companySize
        requestBody.companyType = companyType
        requestBody.recentJobChange = recentJobChange
        requestBody.viewedProfile = viewedProfile
        requestBody.postedRecently = postedRecently
        requestBody.followsCompany = followsCompany
        requestBody.inGroups = inGroups.trim()
        requestBody.firstDegreeConnections = firstDegreeConnections
        requestBody.sharedConnections = sharedConnections
        requestBody.inAccountList = inAccountList
        requestBody.educationInstitution = educationInstitution.trim()
        requestBody.totalExperienceYears = totalExperienceYears.trim()
        requestBody.previousCompany = previousCompany.trim()
        requestBody.annualRevenue = annualRevenue.trim()
        requestBody.employeeCount = employeeCount.trim()
        requestBody.employeeGrowth = employeeGrowth.trim()
        requestBody.companyHeadquarters = companyHeadquarters.trim()
        requestBody.industrySector = industrySector.trim()
        requestBody.leadershipChanges = leadershipChanges
        requestBody.fundingRounds = fundingRounds
      }

      console.log('🔍 Searching social profiles:', requestBody)
      const data = await apiCall('/generate-social-leads', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      if (data.success && data.contacts && data.contacts.length > 0) {
        setGeneratedContacts(data.contacts)
        setShowResults(true)

        setTimeout(() => loadSavedLists(), 1000)

        setSuccess(`✅ ${data.contacts.length} perfis encontrados e adicionados à lista!`)
        console.log(`✅ Found ${data.contacts.length} social profiles`)
      } else {
        setError(data.message || 'Nenhum perfil encontrado para os critérios especificados. Tente ajustar os parâmetros de busca.')
      }
      
    } catch (error) {
      console.error('Error searching social profiles:', error)
      
      if (error.message.includes('Failed to fetch')) {
        setError('🌐 Servidor indisponível. Tente novamente em alguns minutos.')
      } else if (error.message.includes('503')) {
        setError('⚙️ Serviço não configurado. Entre em contato com o administrador.')
      } else if (error.message.includes('401')) {
        setError('🔐 Erro de autenticação. Verifique suas credenciais.')
      } else if (error.message.includes('429')) {
        setError('⏰ Limite de consultas atingido. Aguarde alguns minutos.')
      } else {
        setError(`❌ Erro na busca: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateProfilesWithMeta = async () => {
    console.log('🚀 Starting B2C meta generation')
    
    if (!selectedList) {
      setError('Por favor, selecione uma lista primeiro')
      return
    }
    
    // Validation for extraction mode
    if (extractionMode === 'by-followers') {
      if (!followerLink1.trim()) {
        setError('Por favor, forneça pelo menos um link de perfil')
        return
      }
      
      // Validate URL format
      const urlPattern = /^https?:\/\/(www\.)?(instagram\.com|linkedin\.com)\/.+/i
      if (!urlPattern.test(followerLink1.trim())) {
        setError('Por favor, forneça um link válido do Instagram ou LinkedIn')
        return
      }
      
      if (followerLink2.trim() && !urlPattern.test(followerLink2.trim())) {
        setError('Link 2 inválido. Use um link do Instagram ou LinkedIn')
        return
      }
      
      if (followerLink3.trim() && !urlPattern.test(followerLink3.trim())) {
        setError('Link 3 inválido. Use um link do Instagram ou LinkedIn')
        return
      }
    } else {
      // Validation for Instagram
      if (platform === 'instagram' && !searchKeyword.trim()) {
        setError('Por favor, preencha a palavra-chave de busca')
        return
      }

      // Validation for LinkedIn
      if (platform === 'linkedin') {
        if (!jobTitle.trim() || !jobFunction.trim()) {
          setError('Por favor, preencha Cargo e Função (campos obrigatórios)')
          return
        }
      }
    }

    if (targetContactCount < 1 || targetContactCount > 999) {
      setError('A quantidade de perfis deve estar entre 1 e 999')
      return
    }

    setIsGeneratingWithMeta(true)
    setCancelRequested(false)
    setError(null)
    setSuccess(null)
    setCurrentContactCount(0)
    setGenerationAttempts(0)
    setElapsedSeconds(0)
    setGenerationStartTime(Date.now())

    await new Promise(resolve => setTimeout(resolve, 100))

    let totalGenerated = 0
    let attempts = 0
    const maxAttempts = 30
    let allGeneratedProfiles: SocialContact[] = []
    const startTime = Date.now()
    const TIMEOUT_MS = 180 * 1000 // 180 seconds

    try {
      while (
        totalGenerated < targetContactCount && 
        attempts < maxAttempts && 
        !cancelRequested && 
        (Date.now() - startTime) < TIMEOUT_MS
      ) {
        attempts++
        setGenerationAttempts(attempts)
        
        console.log(`🔄 B2C Attempt ${attempts}: Generated ${totalGenerated}/${targetContactCount}`)

        const requestBody: any = {
          listId: selectedList,
          extractionMode
        }
        
        // By followers mode
        if (extractionMode === 'by-followers') {
          const links = [followerLink1.trim(), followerLink2.trim(), followerLink3.trim()].filter(Boolean)
          requestBody.followerLinks = links
        } else {
          // By niche mode
          requestBody.platform = platform
        }

        // Instagram fields
        if (platform === 'instagram') {
          requestBody.keyword = searchKeyword.trim()
          requestBody.category = category.trim()
          requestBody.location = location.trim()
          requestBody.minFollowers = minFollowers || undefined
          requestBody.maxFollowers = maxFollowers || undefined
        }

        // LinkedIn fields
        if (platform === 'linkedin') {
          requestBody.jobTitle = jobTitle.trim()
          requestBody.jobFunction = jobFunction.trim()
          requestBody.yearsInPosition = yearsInPosition.trim()
          requestBody.yearsInCompany = yearsInCompany.trim()
          requestBody.seniorityLevel = seniorityLevel
          requestBody.location = linkedinLocation.trim()
          requestBody.companySector = companySector.trim()
          requestBody.companySize = companySize
          requestBody.companyType = companyType
          requestBody.recentJobChange = recentJobChange
          requestBody.viewedProfile = viewedProfile
          requestBody.postedRecently = postedRecently
          requestBody.followsCompany = followsCompany
          requestBody.inGroups = inGroups.trim()
          requestBody.firstDegreeConnections = firstDegreeConnections
          requestBody.sharedConnections = sharedConnections
          requestBody.inAccountList = inAccountList
          requestBody.educationInstitution = educationInstitution.trim()
          requestBody.totalExperienceYears = totalExperienceYears.trim()
          requestBody.previousCompany = previousCompany.trim()
          requestBody.annualRevenue = annualRevenue.trim()
          requestBody.employeeCount = employeeCount.trim()
          requestBody.employeeGrowth = employeeGrowth.trim()
          requestBody.companyHeadquarters = companyHeadquarters.trim()
          requestBody.industrySector = industrySector.trim()
          requestBody.leadershipChanges = leadershipChanges
          requestBody.fundingRounds = fundingRounds
        }

        try {
          const data = await apiCall('/generate-social-leads', {
            method: 'POST',
            body: JSON.stringify(requestBody)
          })

          if (data.success && data.contacts && data.contacts.length > 0) {
            const newProfiles = data.contacts.filter(newProfile => 
              !allGeneratedProfiles.some(existing => 
                existing.username.toLowerCase() === newProfile.username.toLowerCase()
              )
            )

            if (newProfiles.length > 0) {
              allGeneratedProfiles = [...allGeneratedProfiles, ...newProfiles]
              totalGenerated = allGeneratedProfiles.length
              setCurrentContactCount(totalGenerated)
              
              console.log(`✅ Added ${newProfiles.length} new profiles. Total: ${totalGenerated}/${targetContactCount}`)
              console.log(`📊 Details: Returned=${data.contacts.length}, Unique=${newProfiles.length}, Total Generated=${totalGenerated}`)
            } else {
              console.log(`ℹ️ No new unique profiles found in attempt ${attempts}`)
              console.log(`📊 Details: Returned=${data.contacts.length}, But all were duplicates`)
            }
            
            // Sempre atualizar currentContactCount mesmo que não haja novos perfis
            // Isso garante que a UI mostre o progresso mesmo com duplicatas
            setCurrentContactCount(totalGenerated)
          }

          if (totalGenerated < targetContactCount && attempts < maxAttempts && !cancelRequested) {
            await new Promise(resolve => setTimeout(resolve, 3000))
          }

        } catch (error) {
          console.error(`❌ Error in B2C attempt ${attempts}:`, error)
          
          const errorMsg = error.message || JSON.stringify(error)
          
          // Better error handling with user-friendly messages
          if (errorMsg.includes('não encontrado') || errorMsg.includes('404')) {
            console.log(`⚠️ Perfil não encontrado - tentando continuar...`)
            if (attempts >= maxAttempts || totalGenerated === 0) {
              setError('❌ Perfil não encontrado ou inacessível. Verifique se:\n• O nome do perfil está correto\n• O perfil é público\n• O link está completo (ex: https://instagram.com/usuario)')
              setIsLoading(false)
              return
            }
            await new Promise(resolve => setTimeout(resolve, 4000))
          } else if (errorMsg.includes('privado') || errorMsg.includes('403')) {
            setError('❌ O perfil informado é privado. Apenas perfis públicos podem ser extraídos.')
            setIsLoading(false)
            return
          } else if (errorMsg.includes('autenticação') || errorMsg.includes('401')) {
            setError('❌ Erro de autenticação. Verifique as configurações de integração.')
            setIsLoading(false)
            return
          } else if (errorMsg.includes('429') || errorMsg.includes('limite de requisições')) {
            console.log(`⏳ Rate limit - aguardando 15 segundos...`)
            await new Promise(resolve => setTimeout(resolve, 15000))
          } else if (errorMsg.includes('Failed to fetch')) {
            console.log(`🔄 Erro de conexão - tentando novamente em 7 segundos...`)
            await new Promise(resolve => setTimeout(resolve, 7000))
          } else {
            console.log(`⚠️ Erro genérico - aguardando 4 segundos...`)
            await new Promise(resolve => setTimeout(resolve, 4000))
          }
        }
      }

      if (cancelRequested) {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedProfiles)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 500)
          setError('⏹️ Geração cancelada. Contatos já gerados foram salvos automaticamente.')
        } else {
          setError('⏹️ Geração cancelada pelo usuário.')
        }
        return
      }

      const elapsedMs = Date.now() - startTime
      const timedOut = elapsedMs >= TIMEOUT_MS && totalGenerated < targetContactCount

      if (totalGenerated >= targetContactCount) {
        setGeneratedContacts(allGeneratedProfiles.slice(0, targetContactCount))
        setShowResults(true)
        
        setTimeout(() => loadSavedLists(), 1000)
        
        setSuccess(`🎉 Meta atingida! ${targetContactCount} perfis gerados e adicionados à lista!`)
        console.log(`🎉 B2C Meta completed: ${targetContactCount} profiles in ${attempts} attempts`)
      } else if (timedOut) {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedProfiles)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setSuccess(`⏱️ Limite de tempo (180s) atingido. ${totalGenerated} perfis encontrados de ${targetContactCount} solicitados. Salvando contatos extraídos...`)
          console.log(`⏱️ B2C Timeout: ${totalGenerated} profiles generated before 180-second timeout`)
        } else {
          setError('❌ Tempo limite (180s) atingido sem encontrar perfis. Verifique os critérios de busca.')
        }
      } else if (attempts >= maxAttempts) {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedProfiles)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setSuccess(`⚠️ Limite de tentativas atingido. ${totalGenerated} perfis encontrados de ${targetContactCount} solicitados.`)
        } else {
          setError('❌ Não foi possível encontrar perfis após múltiplas tentativas. Tente ajustar os critérios de busca.')
        }
      } else {
        if (totalGenerated > 0) {
          setGeneratedContacts(allGeneratedProfiles)
          setShowResults(true)
          setTimeout(() => loadSavedLists(), 1000)
          setSuccess(`⚠️ Geração interrompida. ${totalGenerated} perfis encontrados de ${targetContactCount} solicitados.`)
        } else {
          setError('❌ Nenhum perfil encontrado. Verifique os critérios de busca.')
        }
      }

    } catch (error) {
      console.error('❌ Critical error in B2C meta generation:', error)
      setError(`❌ Erro crítico na geração: ${error.message}`)
    } finally {
      setIsGeneratingWithMeta(false)
      setCancelRequested(false)
      setGenerationStartTime(null)
      setElapsedSeconds(0)
    }
  }

  const cancelGeneration = () => {
    setCancelRequested(true)
    setIsGeneratingWithMeta(false)
    
    if (currentContactCount > 0) {
      // Se há contatos gerados, salva e exibe resultado
      setSuccess(`⏹️ Geração cancelada. ${currentContactCount} perfis encontrados foram salvos.`)
      setTimeout(() => loadSavedLists(), 500)
    } else {
      // Se não há contatos, apenas mostra mensagem
      setError('❌ Geração cancelada. Nenhum perfil foi gerado.')
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Nome', 'Username', 'Plataforma', 'URL do Perfil', 'Bio', 'Seguidores', 'Seguindo', 'Posts', 'Telefone', 'Email', 'Localização', 'Website', 'Verificado', 'Categoria'].join(','),
      ...generatedContacts.map(contact => [
        contact.name || '',
        contact.username || '',
        contact.platform || '',
        contact.profileUrl || '',
        contact.bio || '',
        contact.followers?.toString() || '',
        contact.following?.toString() || '',
        contact.posts?.toString() || '',
        contact.phone || '',
        contact.email || '',
        contact.location || '',
        contact.website || '',
        contact.verified ? 'Sim' : 'Não',
        contact.category || ''
      ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `perfis_b2c_${selectedList}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccess('📁 Arquivo CSV exportado com sucesso!')
  }

  const refreshLists = () => {
    loadSavedLists()
  }

  const loadListContacts = async (listId: string) => {
    setError(null)
    
    try {
      console.log("📊 Loading B2C contacts for list:", listId)
      const data = await apiCall(`/lists/${listId}/contacts`)
      
      if (data.success) {
        setSelectedListToView({
          ...data.list,
          contacts: data.contacts || []
        })
        setShowListViewer(true)
        console.log(`✅ Loaded ${data.contacts?.length || 0} B2C contacts`)
      } else {
        throw new Error(data.message || 'Erro ao carregar perfis')
      }
      
    } catch (error) {
      console.error('Error loading B2C list contacts:', error)
      setError(`Erro ao carregar perfis: ${error.message}`)
    }
  }

  useEffect(() => {
    if (accessToken) {
      console.log("🔑 Access token available, loading B2C lists...")
      loadSavedLists()
    } else {
      console.log("⚠️ No access token, clearing B2C lists")
      setSavedLists([])
      setSelectedList("")
    }
  }, [accessToken])

  useEffect(() => {
    if (isGeneratingWithMeta) {
      setIsGeneratingWithMeta(false)
      setCancelRequested(false)
      setCurrentContactCount(0)
      setGenerationAttempts(0)
    }
  }, [selectedList, platform, searchKeyword, category, location, minFollowers, maxFollowers, targetContactCount])

  // List Viewer
  if (showListViewer && !selectedListToView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
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
                <h1 className="text-xl sm:text-2xl">Suas Listas B2C</h1>
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
            </div>
          </div>

          {viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedLists.map((list) => (
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
                        <span className="text-xs sm:text-sm">{list.totalContacts || 0} perfis</span>
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
                        Ver Perfis
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
                        <th className="px-4 py-3 text-left text-xs font-medium">Nome da Lista</th>
                        <th className="px-4 py-3 text-left text-xs font-medium hidden md:table-cell">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-medium">Perfis</th>
                        <th className="px-4 py-3 text-left text-xs font-medium hidden sm:table-cell">Data de Criação</th>
                        <th className="px-4 py-3 text-right text-xs font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {savedLists.map((list) => (
                        <tr key={list.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
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
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {new Date(list.createdAt).toLocaleDateString('pt-BR')}
                            </span>
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
                Crie sua primeira lista para organizar perfis sociais
              </p>
              <Button onClick={() => setShowListViewer(false)}>
                Criar Lista
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // List Details View
  if (showListViewer && selectedListToView) {
    const contacts = selectedListToView.contacts || []
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
                <Button onClick={exportToCSV} variant="outline" className="gap-2 flex-1 sm:flex-initial">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">Exportar</span>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0" />
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
                  <Instagram className="w-6 h-6 sm:w-8 sm:h-8 text-pink-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Instagram</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.platform === 'instagram').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <Linkedin className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">LinkedIn</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.platform === 'linkedin').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Verificados</p>
                    <p className="text-lg sm:text-2xl truncate">
                      {contacts.filter(c => c.verified).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {contacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border border-border px-4 py-2 text-left text-xs sm:text-sm font-semibold">Usuário</th>
                    <th className="border border-border px-4 py-2 text-left text-xs sm:text-sm font-semibold">Telefone</th>
                    <th className="border border-border px-4 py-2 text-left text-xs sm:text-sm font-semibold">Email</th>
                    <th className="border border-border px-4 py-2 text-left text-xs sm:text-sm font-semibold">Perfil de Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-muted/50">
                      <td className="border border-border px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs sm:text-sm">{contact.name}</span>
                          <a 
                            href={contact.profileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                          >
                            @{contact.username}
                          </a>
                        </div>
                      </td>
                      <td className="border border-border px-4 py-3">
                        {contact.phone ? (
                          <a 
                            href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="border border-border px-4 py-3">
                        {contact.email ? (
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-blue-500 hover:underline text-xs"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="border border-border px-4 py-3">
                        {contact.source_profile ? (
                          <a 
                            href={contact.source_profile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs break-all"
                          >
                            {contact.extracted_from && `@${contact.extracted_from}`}
                          </a>
                        ) : contact.profileUrl && contact.platform !== 'instagram' ? (
                          <a 
                            href={contact.profileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs break-all"
                          >
                            {contact.profileUrl.replace('https://', '')}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum perfil ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Use o gerador para adicionar perfis a esta lista
                </p>
                <Button onClick={() => {
                  setSelectedListToView(null)
                  setShowListViewer(false)
                }}>
                  Gerar Perfis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Main Form
  // Show loading state while initial lists are being fetched
  if (isLoadingLists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            </div>

            {/* Content Skeleton */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                    <div className="space-y-2">
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl">Gerador de Listas B2C</h1>
            <p className="text-sm text-muted-foreground">
              Encontre perfis no Instagram e LinkedIn
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

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="list-select">Lista de Destino</Label>
                    <Select value={selectedList} onValueChange={setSelectedList}>
                      <SelectTrigger id="list-select" disabled={isLoadingLists}>
                        <SelectValue placeholder={isLoadingLists ? "Carregando..." : "Selecione uma lista"} />
                      </SelectTrigger>
                      <SelectContent>
                        {savedLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.totalContacts || 0} perfis)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={showNewListDialog} onOpenChange={setShowNewListDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="mt-6 flex-shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Nova Lista B2C</DialogTitle>
                        <DialogDescription>
                          Crie uma nova lista para organizar perfis sociais
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="new-list-name">Nome da Lista*</Label>
                          <Input
                            id="new-list-name"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="Ex: Influencers de Moda"
                            disabled={isCreatingList}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-list-description">Descrição</Label>
                          <Input
                            id="new-list-description"
                            value={newListDescription}
                            onChange={(e) => setNewListDescription(e.target.value)}
                            placeholder="Ex: Influenciadores de moda no Instagram"
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  Critérios de Busca
                </CardTitle>
                <CardDescription>
                  Defina os parâmetros para encontrar perfis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Modo de Extração */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Modo de Extração</Label>
                  <Tabs value={extractionMode} onValueChange={(v) => setExtractionMode(v as 'by-niche' | 'by-followers')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="by-niche">
                        <Search className="w-4 h-4 mr-2" />
                        Buscar por Nicho
                      </TabsTrigger>
                      <TabsTrigger value="by-followers">
                        <Users className="w-4 h-4 mr-2" />
                        Por Seguidores
                      </TabsTrigger>
                    </TabsList>

                    {/* Buscar por Nicho */}
                    <TabsContent value="by-niche" className="space-y-4 mt-0">
                      <Tabs value={platform} onValueChange={(v) => setPlatform(v as 'instagram' | 'linkedin')}>
                        <TabsList className="grid w-full grid-cols-2 mb-2">
                          <TabsTrigger value="instagram">
                            <Instagram className="w-4 h-4" />
                            Instagram
                          </TabsTrigger>
                          <TabsTrigger value="linkedin">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </TabsTrigger>
                        </TabsList>

                  {/* Instagram Tab Content */}
                  <TabsContent value="instagram" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="keyword">Palavra-chave*</Label>
                      <Input
                        id="keyword"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Ex: moda, tecnologia, fitness"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Categoria (opcional)</Label>
                      <Input
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: influencer, empreendedor, criador de conteúdo"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Localização (opcional)</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ex: São Paulo, Brasil"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-followers">Mín. Seguidores</Label>
                        <Input
                          id="min-followers"
                          type="number"
                          min="0"
                          value={minFollowers || ''}
                          onChange={(e) => setMinFollowers(parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-followers">Máx. Seguidores</Label>
                        <Input
                          id="max-followers"
                          type="number"
                          min="0"
                          value={maxFollowers || ''}
                          onChange={(e) => setMaxFollowers(parseInt(e.target.value) || 0)}
                          placeholder="Sem limite"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-count">Quantidade de Perfis*</Label>
                      <Input
                        id="contact-count"
                        type="number"
                        min="1"
                        max="999"
                        value={targetContactCount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            setTargetContactCount('' as any)
                          } else {
                            const num = parseInt(value)
                            if (!isNaN(num)) {
                              setTargetContactCount(Math.min(999, Math.max(1, num)))
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
                        Mínimo: 1 | Máximo: 999
                      </p>
                    </div>
                  </TabsContent>

                  {/* LinkedIn Tab Content */}
                  <TabsContent value="linkedin" className="space-y-6 mt-4">
                    {/* Campos Obrigatórios */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm">Campos Obrigatórios</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="job-title">Cargo*</Label>
                          <Input
                            id="job-title"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="Ex: Gerente de Vendas"
                          />
                        </div>
                        <div>
                          <Label htmlFor="job-function">Função*</Label>
                          <Input
                            id="job-function"
                            value={jobFunction}
                            onChange={(e) => setJobFunction(e.target.value)}
                            placeholder="Ex: Vendas, Marketing"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Pessoas - Cargo e Função */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Pessoas - Cargo e Função</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="years-position">Anos no Cargo</Label>
                          <Input
                            id="years-position"
                            value={yearsInPosition}
                            onChange={(e) => setYearsInPosition(e.target.value)}
                            placeholder="Ex: 2-5 anos"
                          />
                        </div>
                        <div>
                          <Label htmlFor="years-company">Anos na Empresa</Label>
                          <Input
                            id="years-company"
                            value={yearsInCompany}
                            onChange={(e) => setYearsInCompany(e.target.value)}
                            placeholder="Ex: 1-3 anos"
                          />
                        </div>
                        <div>
                          <Label htmlFor="seniority-level">Nível de Experiência</Label>
                          <Select value={seniorityLevel} onValueChange={setSeniorityLevel}>
                            <SelectTrigger id="seniority-level">
                              <SelectValue placeholder="Selecione o nível" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ceo">CEO</SelectItem>
                              <SelectItem value="diretor">Diretor</SelectItem>
                              <SelectItem value="gerente-senior">Gerente Sênior</SelectItem>
                              <SelectItem value="gerente">Gerente</SelectItem>
                              <SelectItem value="coordenador">Coordenador</SelectItem>
                              <SelectItem value="analista-senior">Analista Sênior</SelectItem>
                              <SelectItem value="analista">Analista</SelectItem>
                              <SelectItem value="assistente">Assistente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Pessoas - Demográficos */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Pessoas - Demográficos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="linkedin-location">Localização Geográfica</Label>
                          <Input
                            id="linkedin-location"
                            value={linkedinLocation}
                            onChange={(e) => setLinkedinLocation(e.target.value)}
                            placeholder="Ex: São Paulo, SP"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company-sector">Setor da Empresa</Label>
                          <Input
                            id="company-sector"
                            value={companySector}
                            onChange={(e) => setCompanySector(e.target.value)}
                            placeholder="Ex: Tecnologia, Varejo"
                          />
                        </div>
                        <div>
                          <Label htmlFor="company-size">Porte da Empresa (Funcionários)</Label>
                          <Select value={companySize} onValueChange={setCompanySize}>
                            <SelectTrigger id="company-size">
                              <SelectValue placeholder="Selecione o porte" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-10">1-10 funcionários</SelectItem>
                              <SelectItem value="11-50">11-50 funcionários</SelectItem>
                              <SelectItem value="51-200">51-200 funcionários</SelectItem>
                              <SelectItem value="201-500">201-500 funcionários</SelectItem>
                              <SelectItem value="501-1000">501-1000 funcionários</SelectItem>
                              <SelectItem value="1001-5000">1001-5000 funcionários</SelectItem>
                              <SelectItem value="5001+">5001+ funcionários</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="company-type">Tipo de Empresa</Label>
                          <Select value={companyType} onValueChange={setCompanyType}>
                            <SelectTrigger id="company-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="publica">Pública</SelectItem>
                              <SelectItem value="privada">Privada</SelectItem>
                              <SelectItem value="autonoma">Autônoma</SelectItem>
                              <SelectItem value="nao-lucrativa">Não Lucrativa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Pessoas - Atividade e Insights */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Pessoas - Atividade e Insights</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="recent-job-change"
                            checked={recentJobChange}
                            onChange={(e) => setRecentJobChange(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="recent-job-change" className="cursor-pointer">
                            Mudaram de emprego recentemente
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="viewed-profile"
                            checked={viewedProfile}
                            onChange={(e) => setViewedProfile(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="viewed-profile" className="cursor-pointer">
                            Viram seu perfil
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="posted-recently"
                            checked={postedRecently}
                            onChange={(e) => setPostedRecently(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="posted-recently" className="cursor-pointer">
                            Postaram nos últimos 30 dias
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="follows-company"
                            checked={followsCompany}
                            onChange={(e) => setFollowsCompany(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="follows-company" className="cursor-pointer">
                            Seguem sua empresa
                          </Label>
                        </div>
                        <div className="col-span-full">
                          <Label htmlFor="in-groups">Estão em grupos específicos</Label>
                          <Input
                            id="in-groups"
                            value={inGroups}
                            onChange={(e) => setInGroups(e.target.value)}
                            placeholder="Ex: Grupo de Vendas B2B"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Pessoas - Conexões */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Pessoas - Conexões</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="first-degree"
                            checked={firstDegreeConnections}
                            onChange={(e) => setFirstDegreeConnections(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="first-degree" className="cursor-pointer">
                            Conexões de primeiro grau com sua equipe (TeamLink)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="shared-connections"
                            checked={sharedConnections}
                            onChange={(e) => setSharedConnections(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="shared-connections" className="cursor-pointer">
                            Conexões em comum
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="account-list"
                            checked={inAccountList}
                            onChange={(e) => setInAccountList(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="account-list" className="cursor-pointer">
                            Pessoas na sua lista de contas
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Pessoas - Experiência */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Pessoas - Experiência</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="education">Instituição de Ensino</Label>
                          <Input
                            id="education"
                            value={educationInstitution}
                            onChange={(e) => setEducationInstitution(e.target.value)}
                            placeholder="Ex: USP, FGV"
                          />
                        </div>
                        <div>
                          <Label htmlFor="total-exp">Anos de Experiência Total</Label>
                          <Input
                            id="total-exp"
                            value={totalExperienceYears}
                            onChange={(e) => setTotalExperienceYears(e.target.value)}
                            placeholder="Ex: 5-10 anos"
                          />
                        </div>
                        <div>
                          <Label htmlFor="previous-company">Empresa Anterior</Label>
                          <Input
                            id="previous-company"
                            value={previousCompany}
                            onChange={(e) => setPreviousCompany(e.target.value)}
                            placeholder="Ex: Google, Microsoft"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Contas - Tamanho e Finanças */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Contas - Tamanho e Finanças</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="annual-revenue">Receita Anual</Label>
                          <Input
                            id="annual-revenue"
                            value={annualRevenue}
                            onChange={(e) => setAnnualRevenue(e.target.value)}
                            placeholder="Ex: R$ 10M - R$ 50M"
                          />
                        </div>
                        <div>
                          <Label htmlFor="employee-count">Número de Funcionários</Label>
                          <Input
                            id="employee-count"
                            value={employeeCount}
                            onChange={(e) => setEmployeeCount(e.target.value)}
                            placeholder="Ex: 100-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="employee-growth">Crescimento de Funcionários</Label>
                          <Input
                            id="employee-growth"
                            value={employeeGrowth}
                            onChange={(e) => setEmployeeGrowth(e.target.value)}
                            placeholder="Ex: 10% nos últimos 6 meses"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Contas - Localização e Setor */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Contas - Localização e Setor</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="headquarters">Sede da Empresa</Label>
                          <Input
                            id="headquarters"
                            value={companyHeadquarters}
                            onChange={(e) => setCompanyHeadquarters(e.target.value)}
                            placeholder="Ex: São Paulo, SP"
                          />
                        </div>
                        <div>
                          <Label htmlFor="industry-sector">Setor de Atuação</Label>
                          <Input
                            id="industry-sector"
                            value={industrySector}
                            onChange={(e) => setIndustrySector(e.target.value)}
                            placeholder="Ex: SaaS, E-commerce"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critérios de Contas - Atividade da Conta */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-sm">Critérios de Contas - Atividade da Conta</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="leadership-changes"
                            checked={leadershipChanges}
                            onChange={(e) => setLeadershipChanges(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="leadership-changes" className="cursor-pointer">
                            Mudanças de liderança
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="funding-rounds"
                            checked={fundingRounds}
                            onChange={(e) => setFundingRounds(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="funding-rounds" className="cursor-pointer">
                            Rodadas de captação de recursos
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="linkedin-contact-count">Quantidade de Perfis*</Label>
                      <Input
                        id="linkedin-contact-count"
                        type="number"
                        min="1"
                        max="999"
                        value={targetContactCount}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '') {
                            setTargetContactCount('' as any)
                          } else {
                            const num = parseInt(value)
                            if (!isNaN(num)) {
                              setTargetContactCount(Math.min(999, Math.max(1, num)))
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
                        Mínimo: 1 | Máximo: 999
                      </p>
                    </div>
                  </TabsContent>
                      </Tabs>
                    </TabsContent>

                    {/* Por Seguidores */}
                    <TabsContent value="by-followers" className="space-y-4 mt-0">
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            🎯 <strong>Extraia seguidores de perfis específicos</strong>
                            <br />
                            Cole até 3 links de perfis do Instagram ou LinkedIn para extrair seus seguidores.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="follower-link-1">Link do Perfil 1*</Label>
                          <div className="flex gap-2">
                            <Link className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2.5" />
                            <Input
                              id="follower-link-1"
                              value={followerLink1}
                              onChange={(e) => setFollowerLink1(e.target.value)}
                              placeholder="Ex: https://instagram.com/usuario ou https://linkedin.com/in/usuario"
                              type="url"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="follower-link-2">Link do Perfil 2 (opcional)</Label>
                          <div className="flex gap-2">
                            <Link className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2.5" />
                            <Input
                              id="follower-link-2"
                              value={followerLink2}
                              onChange={(e) => setFollowerLink2(e.target.value)}
                              placeholder="Ex: https://instagram.com/usuario2"
                              type="url"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="follower-link-3">Link do Perfil 3 (opcional)</Label>
                          <div className="flex gap-2">
                            <Link className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2.5" />
                            <Input
                              id="follower-link-3"
                              value={followerLink3}
                              onChange={(e) => setFollowerLink3(e.target.value)}
                              placeholder="Ex: https://instagram.com/usuario3"
                              type="url"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="follower-count">Quantidade de Seguidores*</Label>
                          <Input
                            id="follower-count"
                            type="number"
                            min="1"
                            max="999"
                            value={targetContactCount}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === '') {
                                setTargetContactCount('' as any)
                              } else {
                                const num = parseInt(value)
                                if (!isNaN(num)) {
                                  setTargetContactCount(Math.min(999, Math.max(1, num)))
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
                            Mínimo: 1 | Máximo: 999
                          </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-900 dark:text-amber-100">
                            💡 <strong>Dica:</strong> O sistema irá extrair seguidores dos perfis informados e consolidar em uma única lista, removendo duplicatas automaticamente.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              {!isGeneratingWithMeta ? (
                <Button
                  onClick={generateProfilesWithMeta}
                  disabled={
                    isLoading || 
                    !selectedList || 
                    (extractionMode === 'by-followers' && !followerLink1.trim()) ||
                    (extractionMode === 'by-niche' && platform === 'instagram' && !searchKeyword.trim()) ||
                    (extractionMode === 'by-niche' && platform === 'linkedin' && (!jobTitle.trim() || !jobFunction.trim()))
                  }
                  className="flex-1 gap-2"
                  size="lg"
                  variant="default"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Gerar Lista de Contatos
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={cancelGeneration}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  Cancelar Geração
                </Button>
              )}
            </div>

            {isGeneratingWithMeta && (
              <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        <span className="font-medium">Gerando perfis...</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">
                        ⏱️ {elapsedSeconds}s / 180s
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progresso</span>
                        <span className="font-medium">
                          {currentContactCount} / {targetContactCount} perfis
                        </span>
                      </div>
                      <Progress value={(currentContactCount / targetContactCount) * 100} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este processo pode levar alguns minutos. Aguarde enquanto buscamos os melhores perfis para você.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {showResults && generatedContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Resultados da Busca</CardTitle>
                      <CardDescription>
                        {generatedContacts.length} perfis encontrados
                      </CardDescription>
                    </div>
                    <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedContacts.slice(0, 5).map((contact) => (
                      <div key={contact.id} className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <UserCircle className="w-8 h-8 text-purple-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base truncate">{contact.name}</p>
                              {contact.verified && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">@{contact.username}</p>
                            {contact.bio && (
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{contact.bio}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {contact.followers !== undefined && (
                                <Badge variant="secondary" className="gap-1">
                                  <Users className="w-3 h-3" />
                                  {formatNumber(contact.followers)}
                                </Badge>
                              )}
                              <Badge variant="outline" className="gap-1">
                                {contact.platform === 'instagram' ? (
                                  <>
                                    <Instagram className="w-3 h-3" />
                                    Instagram
                                  </>
                                ) : (
                                  <>
                                    <Linkedin className="w-3 h-3" />
                                    LinkedIn
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {generatedContacts.length > 5 && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center pt-2">
                        E mais {generatedContacts.length - 5} perfis. Use "Ver Listas" para visualizar todos.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
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
                    <List className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    <span className="text-xs sm:text-sm">Listas Criadas</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold">{savedLists.length}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                    <span className="text-xs sm:text-sm">Total de Perfis</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold">
                    {savedLists.reduce((acc, list) => acc + (list.totalContacts || 0), 0)}
                  </span>
                </div>

                {selectedList && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      <span className="text-xs sm:text-sm">Lista Selecionada</span>
                    </div>
                    <span className="text-base sm:text-lg font-semibold">
                      {savedLists.find(l => l.id === selectedList)?.totalContacts || 0}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Dicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <p>
                  📱 <strong>Instagram:</strong> Encontre influencers, criadores de conteúdo e marcas.
                </p>
                <p>
                  💼 <strong>LinkedIn:</strong> Encontre profissionais, empreendedores e empresas.
                </p>
                <p>
                  🔍 <strong>Palavra-chave:</strong> Use termos relevantes para encontrar perfis relacionados.
                </p>
                <p>
                  📊 <strong>Seguidores:</strong> Filtre por quantidade mínima e máxima de seguidores.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Limit Error Modal */}
      <ErrorModal
        isOpen={showLimitError}
        onClose={() => setShowLimitError(false)}
        title="Limite de Campanhas Atingido"
        message={limitErrorData?.message || "Você atingiu o limite de listas/campanhas para seu plano"}
        plan={limitErrorData?.plan}
        currentCount={limitErrorData?.current_count}
        maxLimit={limitErrorData?.max_limit}
        limitName={limitErrorData?.limit_name}
      />
    </div>
  )
}

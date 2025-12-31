import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"
import { useAuth } from "../hooks/useAuthLaravel"
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  Save,
  Key,
  Bell,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Settings,
  Loader2,
  Circle,
  Eye,
  EyeOff
} from "lucide-react"
import { Switch } from "./ui/switch"
import { getApiUrl } from '../utils/apiConfig'
import { safeFetch } from '../utils/fetchWithTimeout'

function AccountSettingsContent() {
  const { user, isAdmin, accessToken, updateUser } = useAuth()
  const baseUrl = getApiUrl()
  
  console.log('🔍 [AccountSettings] Auth state:', {
    user: user?.email,
    accessToken: accessToken ? '✅ presente' : '❌ faltando',
    baseUrl
  })
  
  // Modo edição
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  
  // Plan and subscription data
  const [planData, setPlanData] = useState<{
    current_plan: string
    name: string
    description: string
    status: string
    started_at: string
    ends_at: string
    limits: {
      max_contacts_per_month: number
      max_connected_numbers: number
      max_ai_agents: number
      max_automations: number
      max_campaigns_per_month: number
      max_concurrent_calls: number
    }
  } | null>(null)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  
  // User info
  const [name, setName] = useState(user?.name || "")
  const [lastName, setLastName] = useState(user?.last_name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [company, setCompany] = useState(user?.company || "")
  const [cpf, setCpf] = useState(user?.cpf || "")
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || "")
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || "")
  
  // Address fields (granular)
  const [addressStreet, setAddressStreet] = useState(user?.address_street || "")
  const [addressNumber, setAddressNumber] = useState(user?.address_number || "")
  const [addressComplement, setAddressComplement] = useState(user?.address_complement || "")
  const [addressNeighborhood, setAddressNeighborhood] = useState(user?.address_neighborhood || "")
  const [addressCity, setAddressCity] = useState(user?.address_city || "")
  const [addressState, setAddressState] = useState(user?.address_state || "")
  const [addressZipcode, setAddressZipcode] = useState(user?.address_zipcode || "")
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true)
  const [whatsappNotifications, setWhatsappNotifications] = useState(user?.whatsapp_notifications ?? true)
  const [weeklyReport, setWeeklyReport] = useState(user?.weekly_report ?? true)
  
  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState<boolean | null>(null)
  const [isCheckingCurrentPassword, setIsCheckingCurrentPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)

  // 🔐 Função para calcular força da senha em tempo real
  // Converter data de YYYY-MM-DD para formato exibição DD/MM/YYYY
  const formatDateDisplay = (date?: string) => {
    if (!date) return ''
    // Se está em formato YYYY-MM-DD, converter para DD/MM/YYYY
    if (date.includes('-') && !date.includes('/')) {
      const parts = date.split('-')
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    // Se já está em DD/MM/YYYY, retorna como está
    return date
  }

  // Converter data de YYYY-MM-DD para input type="date" (requer YYYY-MM-DD)
  const formatDateToInput = (date?: string) => {
    if (!date) return ''
    // Se já está em formato YYYY-MM-DD, retorna como está
    if (date.includes('-') && !date.includes('/')) {
      return date
    }
    // Se está em DD/MM/YYYY, converte para YYYY-MM-DD
    if (date.includes('/')) {
      const parts = date.split('/')
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return date
  }

  // Converter data de DD/MM/YYYY para YYYY-MM-DD para enviar ao backend
  const formatDateForBackend = (date: string) => {
    if (!date) return ''
    // Se está em DD/MM/YYYY (input manual), converter para YYYY-MM-DD
    if (date.includes('/')) {
      const parts = date.split('/')
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    // Se já está em YYYY-MM-DD, retorna como está
    return date
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' }
    
    let score = 0
    const checks = {
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecial: /[@$!%*?&#\-_]/.test(password),
    }
    
    // Contar quantos requisitos foram atendidos
    Object.values(checks).forEach(check => {
      if (check) score++
    })
    
    if (score < 2) {
      return { score, label: '❌ Fraca', color: 'text-red-600', allMet: false }
    } else if (score < 4) {
      return { score, label: '⚠️ Razoável', color: 'text-yellow-600', allMet: false }
    } else if (score < 5) {
      return { score, label: '✅ Boa', color: 'text-green-600', allMet: false }
    } else {
      return { score, label: '🔥 Excelente', color: 'text-green-700', allMet: true }
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  // Renderizar requisitos da senha
  const renderPasswordRequirements = () => {
    const checks = [
      { met: newPassword.length >= 8, label: 'Mínimo 8 caracteres' },
      { met: /[A-Z]/.test(newPassword), label: 'Letra maiúscula' },
      { met: /[a-z]/.test(newPassword), label: 'Letra minúscula' },
      { met: /\d/.test(newPassword), label: 'Número' },
      { met: /[@$!%*?&]/.test(newPassword), label: 'Caractere especial (@$!%*?&)' },
    ]
    
    return (
      <div className="space-y-2 text-sm">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {check.met ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300" />
            )}
            <span className={check.met ? 'text-green-600' : 'text-gray-600'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // 🔐 Validar senha atual em tempo real com debounce
  const validateCurrentPassword = async (password: string) => {
    if (!password) {
      setIsCurrentPasswordValid(null)
      return
    }

    setIsCheckingCurrentPassword(true)
    
    try {
      // Log detalhado do que está sendo enviado
      console.log("🔐 [VERIFY PASSWORD] Enviando para validação:", {
        password_length: password.length,
        password_trimmed_length: password.trim().length,
        first_char: password.charCodeAt(0),
        last_char: password.charCodeAt(password.length - 1),
      })
      
      const response = await safeFetch(
        `${baseUrl}/auth/verify-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            current_password: password,
          }),
        },
        30000
      )

      const data = await response.json()
      
      console.log("🔐 [VERIFY PASSWORD] Resposta:", {
        status: response.status,
        valid: data.valid,
        message: data.message
      })
      
      setIsCurrentPasswordValid(data.valid)
    } catch (error) {
      console.error('❌ [VERIFY PASSWORD] Erro ao validar:', error)
      setIsCurrentPasswordValid(null)
    } finally {
      setIsCheckingCurrentPassword(false)
    }
  }

  // Debounce para validação da senha atual (não fazer muitas requisições)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPassword) {
        validateCurrentPassword(currentPassword)
      }
    }, 800) // Aguarda 800ms após parar de digitar

    return () => clearTimeout(timer)
  }, [currentPassword])

  // Carregar dados do usuário quando ele muda
  useEffect(() => {
    if (user) {
      console.log("📋 [AccountSettings] Carregando dados do contexto:", {
        name: user.name,
        last_name: user.last_name,
        cpf: user.cpf,
        date_of_birth: user.date_of_birth,
        whatsapp: user.whatsapp,
        phone: user.phone,
        company: user.company,
        address_street: user.address_street,
        address_city: user.address_city,
        address_state: user.address_state,
        address_zipcode: user.address_zipcode,
        email_notifications: user.email_notifications,
      })
      
      setName(user.name || "")
      setLastName(user.last_name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      setCompany(user.company || "")
      setCpf(user.cpf || "")
      setDateOfBirth(formatDateToInput(user.date_of_birth))
      setWhatsapp(user.whatsapp || "")
      setAddressStreet(user.address_street || "")
      setAddressNumber(user.address_number || "")
      setAddressComplement(user.address_complement || "")
      setAddressNeighborhood(user.address_neighborhood || "")
      setAddressCity(user.address_city || "")
      setAddressState(user.address_state || "")
      setAddressZipcode(user.address_zipcode || "")
      setEmailNotifications(user.email_notifications ?? true)
      setWhatsappNotifications(user.whatsapp_notifications ?? true)
      setWeeklyReport(user.weekly_report ?? true)
    }
  }, [user])

  // Carregar dados de plano e subscription
  useEffect(() => {
    const fetchPlanData = async () => {
      if (!user || !accessToken) {
        setIsLoadingPlan(false)
        return
      }

      try {
        setIsLoadingPlan(true)
        console.log('📡 Carregando dados do plano com token:', accessToken ? '✅ presente' : '❌ faltando')
        
        // baseUrl já vem com /api, não adicionar novamente
        const url = baseUrl.endsWith('/api') 
          ? `${baseUrl}/auth/me`
          : `${baseUrl}/api/auth/me`
        
        console.log('🔗 URL:', url)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('📊 Resposta do /api/auth/me:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Dados recebidos:', data.plan)
          if (data.plan) {
            setPlanData(data.plan)
          }
        } else {
          console.warn('⚠️ Erro ao carregar dados do plano:', response.status, response.statusText)
          const errorText = await response.text()
          console.warn('Resposta:', errorText)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar plano:', error)
      } finally {
        setIsLoadingPlan(false)
      }
    }

    fetchPlanData()
  }, [user, accessToken, baseUrl])

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setErrorMessage("Nome é obrigatório")
      return
    }

    setIsLoadingProfile(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // 🔴 CRÍTICO: Construir payload apenas com campos que têm valores
      // Isso garante que o backend receba apenas dados válidos
      const payload: any = {}
      
      // Nome SEMPRE deve estar presente (obrigatório)
      if (name.trim()) {
        payload.name = name.trim()
      }
      
      // Novos campos de perfil
      if (lastName.trim()) payload.last_name = lastName.trim()
      if (cpf.trim()) payload.cpf = cpf.trim()
      if (dateOfBirth.trim()) payload.date_of_birth = formatDateForBackend(dateOfBirth.trim())
      if (whatsapp.trim()) payload.whatsapp = whatsapp.trim()
      
      // Incluir outros campos APENAS se tiverem valores (evitar null/undefined)
      if (company.trim()) payload.company = company.trim()
      if (phone.trim()) payload.phone = phone.trim()
      if (addressStreet.trim()) payload.address_street = addressStreet.trim()
      if (addressNumber.trim()) payload.address_number = addressNumber.trim()
      if (addressComplement.trim()) payload.address_complement = addressComplement.trim()
      if (addressNeighborhood.trim()) payload.address_neighborhood = addressNeighborhood.trim()
      if (addressCity.trim()) payload.address_city = addressCity.trim()
      if (addressState.trim()) payload.address_state = addressState.trim().toUpperCase()
      
      // CEP: Validar formato antes de enviar (não enviar valores inválidos)
      if (addressZipcode.trim()) {
        // Aceitar formatos: 12345678 ou 12345-678
        const zipValid = /^(\d{8}|\d{5}-\d{3})$/.test(addressZipcode.trim())
        if (!zipValid) {
          console.warn("⚠️ CEP inválido:", addressZipcode)
          // Se CEP é inválido, não incluir no payload (evitar erro)
          // payload.address_zipcode não será definido
        } else {
          payload.address_zipcode = addressZipcode.trim()
        }
      }

      // Se nenhum campo foi preenchido, mostrar erro
      if (Object.keys(payload).length === 0) {
        setErrorMessage("Preencha pelo menos o nome")
        return
      }

      // 🔴 PASSO 1: Enviar dados ao servidor
      console.log("📤 Enviando perfil para salvar:", payload)
      const response = await safeFetch(
        `${baseUrl}/auth/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
        30000
      )

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("❌ Erro ao fazer parse do JSON:", jsonError)
        console.error("Response status:", response.status)
        setErrorMessage("Erro na resposta do servidor. Verifique os logs.")
        setIsLoadingProfile(false)
        return
      }

      console.log("🔍 Status da resposta:", response.status)
      console.log("🔍 Dados da resposta completa:", JSON.stringify(data, null, 2))

      if (response.ok && data.success) {
        console.log("✅ Perfil salvo com sucesso no servidor:", data.user)
        
        // 🔴 CRÍTICO EM PRODUÇÃO: Após salvar, RECARREGAR dados do servidor
        // Isso garante sincronização total entre frontend e backend
        try {
          console.log("🔄 Recarregando dados do usuário do servidor...")
          const meResponse = await safeFetch(
            `${baseUrl}/auth/me`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
            30000
          )

          if (meResponse.ok) {
            const meData = await meResponse.json()
            const updatedUser = meData.user
            
            console.log("✅ Dados do servidor sincronizados:", updatedUser)
            
            // Atualizar states com dados do servidor (fonte da verdade)
            setName(updatedUser.name || "")
            setLastName(updatedUser.last_name || "")
            setEmail(updatedUser.email || "")
            setPhone(updatedUser.phone || "")
            setCompany(updatedUser.company || "")
            setCpf(updatedUser.cpf || "")
            setDateOfBirth(formatDateToInput(updatedUser.date_of_birth))
            setWhatsapp(updatedUser.whatsapp || "")
            setAddressStreet(updatedUser.address_street || "")
            setAddressNumber(updatedUser.address_number || "")
            setAddressComplement(updatedUser.address_complement || "")
            setAddressNeighborhood(updatedUser.address_neighborhood || "")
            setAddressCity(updatedUser.address_city || "")
            setAddressState(updatedUser.address_state || "")
            setAddressZipcode(updatedUser.address_zipcode || "")
            
            // 🔥 CRÍTICO: Atualizar contexto global com novos dados
            // Isso garante que dados persistem mesmo após hard refresh
            updateUser({
              name: updatedUser.name,
              last_name: updatedUser.last_name,
              email: updatedUser.email,
              phone: updatedUser.phone,
              company: updatedUser.company,
              cpf: updatedUser.cpf,
              date_of_birth: updatedUser.date_of_birth,
              whatsapp: updatedUser.whatsapp,
              address_street: updatedUser.address_street,
              address_number: updatedUser.address_number,
              address_complement: updatedUser.address_complement,
              address_neighborhood: updatedUser.address_neighborhood,
              address_city: updatedUser.address_city,
              address_state: updatedUser.address_state,
              address_zipcode: updatedUser.address_zipcode,
              email_notifications: updatedUser.email_notifications,
              whatsapp_notifications: updatedUser.whatsapp_notifications,
              weekly_report: updatedUser.weekly_report,
            })
            
            setSuccessMessage("✅ Perfil atualizado com sucesso!")
            setTimeout(() => setSuccessMessage(null), 4000)
            // Voltar ao modo visualização após salvar
            setIsEditingProfile(false)
          } else {
            // Se /auth/me falhar, ao menos mostrar que o perfil foi salvo
            console.warn("⚠️ Não foi possível recarregar dados do servidor, mas perfil foi salvo")
            setSuccessMessage("✅ Perfil atualizado com sucesso!")
            setTimeout(() => setSuccessMessage(null), 4000)
            // Voltar ao modo visualização após salvar
            setIsEditingProfile(false)
          }
        } catch (syncError) {
          console.error('⚠️ Erro ao sincronizar dados:', syncError)
          // Não mostrar erro se falhar sincronização, pois dados já foram salvos
          setSuccessMessage("✅ Perfil atualizado com sucesso!")
          setTimeout(() => setSuccessMessage(null), 4000)
          // Voltar ao modo visualização após salvar
          setIsEditingProfile(false)
        }
      } else {
        // Erro do servidor - mostrar mensagem detalhada
        console.error("❌ Erro ao salvar perfil - Status:", response.status)
        console.error("❌ Resposta de erro completa:", JSON.stringify(data, null, 2))
        
        // Exibir mensagens de validação do backend se existirem
        if (data.message) {
          console.error("❌ Mensagem:", data.message)
          setErrorMessage(data.message)
        } else if (data.errors) {
          console.error("❌ Erros de validação:", data.errors)
          const errorMessages = Object.entries(data.errors)
            .map(([field, messages]: any) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join(' | ')
          setErrorMessage(errorMessages)
        } else if (data.error) {
          setErrorMessage(data.error)
        } else {
          setErrorMessage("Erro ao salvar perfil. Tente novamente.")
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error)
      setErrorMessage("Erro ao conectar ao servidor. Tente novamente.")
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    // Validação 1: Campos vazios
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Preencha todos os campos de senha")
      return
    }
    
    // Validação 2: Senhas conferem
    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não coincidem")
      return
    }
    
    // Validação 3: Comprimento mínimo
    if (newPassword.length < 8) {
      setErrorMessage("A senha deve ter no mínimo 8 caracteres")
      return
    }

    // Validação 4: Requisitos de força (maiúsculas, minúsculas, números, caracteres especiais)
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasSpecialChar = /[@$!%*?&#\-_]/.test(newPassword)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setErrorMessage("A senha deve conter maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&#-_)")
      return
    }

    setIsLoadingPassword(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      console.log("🔐 [PASSWORD CHANGE] Iniciando mudança de senha")
      
      const response = await safeFetch(
        `${baseUrl}/auth/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirmation: confirmPassword,
          }),
        },
        30000
      )

      const data = await response.json()
      
      console.log("📊 [PASSWORD CHANGE] Resposta do servidor:", {
        status: response.status,
        success: data.success,
        message: data.message
      })

      if (response.ok && data.success) {
        console.log("✅ [PASSWORD CHANGE] Senha alterada com sucesso!")
        
        // Limpar formulário
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        
        setSuccessMessage("✅ Senha alterada com sucesso! Você será redirecionado para login em alguns segundos...")
        
        // ⚠️ CRÍTICO: Logout após trocar senha (tokens antigos ficam inválidos)
        // O servidor revoga todos os tokens, então precisa fazer login novamente
        console.log("🔄 [PASSWORD CHANGE] Redirecionando para login em 3 segundos...")
        setTimeout(() => {
          console.log("🚪 [PASSWORD CHANGE] Redirecionando agora...")
          window.location.href = '/login'
        }, 3000)
      } else {
        console.error("❌ [PASSWORD CHANGE] Erro ao alterar senha:", data)
        
        // Tratar erro específico de senha incorreta
        if (response.status === 401 && data.error === 'Senha atual incorreta') {
          setErrorMessage("❌ Senha atual incorreta. Tente novamente.")
        } else {
          setErrorMessage(data.error || data.message || "Erro ao alterar senha")
        }
      }
    } catch (error) {
      console.error('❌ [PASSWORD CHANGE] Erro ao conectar ao servidor:', error)
      setErrorMessage("Erro ao conectar ao servidor. Tente novamente.")
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsLoadingNotifications(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      console.log("📤 Salvando preferências de notificação:", {
        email_notifications: emailNotifications,
        whatsapp_notifications: whatsappNotifications,
        weekly_report: weeklyReport
      })

      const response = await safeFetch(
        `${baseUrl}/auth/notifications`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email_notifications: emailNotifications,
            whatsapp_notifications: whatsappNotifications,
            weekly_report: weeklyReport,
          }),
        },
        30000
      )

      const data = await response.json()

      if (response.ok && data.success) {
        console.log("✅ Preferências salvas com sucesso:", data.user)
        
        // 🔴 CRÍTICO: Recarregar dados após atualização
        try {
          console.log("🔄 Sincronizando preferências do servidor...")
          const meResponse = await safeFetch(
            `${baseUrl}/auth/me`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
            30000
          )

          if (meResponse.ok) {
            const meData = await meResponse.json()
            const updatedUser = meData.user
            
            // Atualizar states com dados do servidor
            setEmailNotifications(updatedUser.email_notifications ?? true)
            setWhatsappNotifications(updatedUser.whatsapp_notifications ?? true)
            setWeeklyReport(updatedUser.weekly_report ?? true)
            
            console.log("✅ Preferências sincronizadas do servidor")
            setSuccessMessage("✅ Preferências de notificação atualizadas!")
            setTimeout(() => setSuccessMessage(null), 4000)
          } else {
            console.warn("⚠️ Não foi possível sincronizar preferências")
            setSuccessMessage("✅ Preferências de notificação atualizadas!")
            setTimeout(() => setSuccessMessage(null), 4000)
          }
        } catch (syncError) {
          console.error('⚠️ Erro ao sincronizar:', syncError)
          setSuccessMessage("✅ Preferências de notificação atualizadas!")
          setTimeout(() => setSuccessMessage(null), 4000)
        }
      } else {
        console.error("❌ Erro ao salvar preferências:", data)
        setErrorMessage(data.error || "Erro ao salvar preferências")
      }
    } catch (error) {
      console.error('❌ Erro ao salvar notificações:', error)
      setErrorMessage("Erro ao conectar ao servidor. Tente novamente.")
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  // Função auxiliar para renderizar campo em modo visualização
  const renderViewField = (label: string, value: string, icon?: any, formatter?: (v: string) => string) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="w-4 h-4 text-muted-foreground">{icon}</span>}
        <p className="text-sm font-medium">{formatter ? formatter(value) : value || "-"}</p>
      </div>
    </div>
  )

  // Função auxiliar para renderizar input em modo edição
  const renderEditField = (id: string, label: string, value: string, onChange: (val: string) => void, placeholder: string, icon?: any, disabled: boolean = false, type: string = "text") => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">{icon}</span>}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={icon ? "pl-10" : ""}
          max={type === "date" ? new Date().toISOString().split('T')[0] : undefined}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    {isEditingProfile ? "Edite suas informações de perfil" : "Visualize suas informações de perfil"}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MODO VISUALIZAÇÃO */}
            {!isEditingProfile ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("Nome", name)}
                  {renderViewField("Sobrenome", lastName)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("Email", email)}
                  {renderViewField("Telefone", phone, <Phone className="w-4 h-4" />)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("CPF", cpf)}
                  {renderViewField("Data de Nascimento", dateOfBirth, undefined, formatDateDisplay)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("WhatsApp", whatsapp)}
                  {renderViewField("Empresa", company, <Building2 className="w-4 h-4" />)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("Rua", addressStreet, <MapPin className="w-4 h-4" />)}
                  {renderViewField("Número", addressNumber)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("Complemento", addressComplement)}
                  {renderViewField("Bairro", addressNeighborhood)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderViewField("Cidade", addressCity)}
                  {renderViewField("Estado", addressState)}
                </div>

                <div>
                  {renderViewField("CEP", addressZipcode)}
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setIsEditingProfile(true)}
                    variant="default"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Editar Informações
                  </Button>
                </div>
              </>
            ) : (
              /* MODO EDIÇÃO */
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("name", "Nome", name, setName, "Seu nome")}
                  {renderEditField("last_name", "Sobrenome", lastName, setLastName, "Seu sobrenome")}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("email", "Email", email, setEmail, "seu@email.com", undefined, true)}
                  {renderEditField("phone", "Telefone", phone, setPhone, "+55 11 99999-9999", <Phone className="w-4 h-4" />)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("cpf", "CPF", cpf, setCpf, "XXX.XXX.XXX-XX")}
                  {renderEditField("date_of_birth", "Data de Nascimento (DD/MM/YYYY)", dateOfBirth, setDateOfBirth, "DD/MM/YYYY", undefined, false, "date")}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("whatsapp", "WhatsApp", whatsapp, setWhatsapp, "(XX) XXXXX-XXXX")}
                  {renderEditField("company", "Empresa", company, setCompany, "Nome da empresa", <Building2 className="w-4 h-4" />)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("address_street", "Rua", addressStreet, setAddressStreet, "Nome da rua", <MapPin className="w-4 h-4" />)}
                  {renderEditField("address_number", "Número", addressNumber, setAddressNumber, "000")}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("address_complement", "Complemento", addressComplement, setAddressComplement, "Apto, sala, etc.")}
                  {renderEditField("address_neighborhood", "Bairro", addressNeighborhood, setAddressNeighborhood, "Nome do bairro")}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderEditField("address_city", "Cidade", addressCity, setAddressCity, "Nome da cidade")}
                  {renderEditField("address_state", "Estado", addressState, setAddressState, "SP", undefined, false)}
                </div>

                <div>
                  {renderEditField("address_zipcode", "CEP", addressZipcode, setAddressZipcode, "00000-000")}
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={() => setIsEditingProfile(false)}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={isLoadingProfile}
                  >
                    {isLoadingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Altere sua senha de acesso com segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Senha Atual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="current-password">Senha Atual</Label>
                {currentPassword && (
                  <div className="flex items-center gap-1">
                    {isCheckingCurrentPassword ? (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Verificando...
                      </span>
                    ) : isCurrentPasswordValid ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Senha Correta
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Senha Incorreta
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className={`border-gray-300 pr-10 ${
                    currentPassword && isCurrentPasswordValid === false ? 'border-red-500 border-2' : 
                    currentPassword && isCurrentPasswordValid === true ? 'border-green-500 border-2' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">Digite sua senha atual para confirmar a alteração</p>
            </div>

            {/* Divisor */}
            <Separator />

            {/* Nova Senha e Confirmação */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">
                  Nova Senha
                  {newPassword && (
                    <span className={`ml-2 text-xs font-semibold ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`border-gray-300 pr-10 ${newPassword ? (passwordStrength.allMet ? 'border-green-500' : 'border-yellow-500') : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente"
                    className={`border-gray-300 pr-10 ${confirmPassword && newPassword === confirmPassword ? 'border-green-500' : confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600">✅ Senhas conferem</p>
                )}
              </div>
            </div>

            {/* Requisitos de Força da Senha */}
            {newPassword && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-700">Requisitos da Senha</p>
                </div>
                {renderPasswordRequirements()}
              </div>
            )}

            {/* Aviso Importante */}
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                ⚠️ Após alterar a senha, você será redirecionado para a tela de login. Use a nova senha para acessar sua conta.
              </AlertDescription>
            </Alert>

            <Separator />

            {/* Botão de Ação */}
            <div className="flex justify-end gap-2">
              {newPassword && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentPassword("")
                    setNewPassword("")
                    setConfirmPassword("")
                  }}
                >
                  Limpar
                </Button>
              )}
              <Button 
                onClick={handleChangePassword}
                disabled={
                  !currentPassword || 
                  !newPassword || 
                  !confirmPassword || 
                  isLoadingPassword || 
                  !passwordStrength.allMet || 
                  newPassword !== confirmPassword ||
                  isCurrentPasswordValid !== true  // 🔥 NOVO: Desabilitar se senha atual for inválida
                }
                className="bg-blue-600 hover:bg-blue-700"
                title={isCurrentPasswordValid === false ? "A senha atual está incorreta" : ""}
              >
                {isLoadingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Configure como você quer receber atualizações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba atualizações sobre suas campanhas e leads por email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsapp-notifications">Notificações por WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsapp-notifications"
                checked={whatsappNotifications}
                onCheckedChange={setWhatsappNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-report">Relatório Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um resumo semanal do desempenho de vendas
                </p>
              </div>
              <Switch
                id="weekly-report"
                checked={weeklyReport}
                onCheckedChange={setWeeklyReport}
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveNotifications}
                disabled={isLoadingNotifications}
              >
                {isLoadingNotifications ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Preferências
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <CardTitle>Plano e Assinatura</CardTitle>
            </div>
            <CardDescription>
              Informações sobre seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingPlan ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Carregando informações do plano...</span>
              </div>
            ) : planData ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border" style={{ background: 'linear-gradient(to right, #E8F1FD, #E3F2EC)', borderColor: '#1F5FBF40' }}>
                  <div>
                    <p className="font-semibold text-lg">{planData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {planData.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={planData.status === 'active' ? 'bg-green-600' : 'bg-yellow-600'}>
                      {planData.status === 'active' ? '✓ Ativo' : planData.status.toUpperCase()}
                    </Badge>
                    {planData.name.toUpperCase() !== 'CUSTOM' && (
                      <Button 
                        onClick={() => window.location.hash = '#/plans'}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <CreditCard className="w-4 h-4" />
                        Fazer Upgrade
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Contatos/Mês</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_contacts_per_month === 2147483647 ? '∞' : planData.limits.max_contacts_per_month}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Números Conectados</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_connected_numbers === 2147483647 ? '∞' : planData.limits.max_connected_numbers}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Agentes IA</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_ai_agents === 2147483647 ? '∞' : planData.limits.max_ai_agents}
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Automações</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_automations === 2147483647 ? '∞' : planData.limits.max_automations}
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Campanhas/Mês</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_campaigns_per_month === 2147483647 ? '∞' : planData.limits.max_campaigns_per_month}
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Atend. Simultâneos</p>
                    <p className="text-2xl font-semibold">
                      {planData.limits.max_concurrent_calls === 2147483647 ? '∞' : planData.limits.max_concurrent_calls}
                    </p>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Plano válido até {new Date(planData.ends_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível carregar as informações do plano. Tente recarregar a página.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export function AccountSettings() {
  return <AccountSettingsContent />
}
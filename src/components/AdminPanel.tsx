import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { ConnectionStatus } from "./ConnectionStatus"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { 
  Users, 
  Crown, 
  Loader2, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Shield,
  Key,
  Database,
  Activity,
  Save,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare
} from "lucide-react"

interface AdminStats {
  totalUsers: number
  activeUsers: number
  systemStatus: string
}

interface User {
  id: string
  name: string
  email: string
  company: string
  plan: string
  createdAt: string
  role: string
}

interface ConnectionState {
  isOnline: boolean
  lastError: string | null
  lastSuccess: string | null
  retryCount: number
}

export function AdminPanel() {
  const { accessToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [connection, setConnection] = useState<ConnectionState>({
    isOnline: false,
    lastError: null,
    lastSuccess: null,
    retryCount: 0
  })
  
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 1,
    activeUsers: 1,
    systemStatus: 'operational'
  })
  const [users, setUsers] = useState<User[]>([])

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api'

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${baseUrl}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`)
        throw new Error(`${response.status}: ${errorText}`)
      }

      const data = await response.json()
      
      // Update connection state on success
      setConnection(prev => ({
        isOnline: true,
        lastError: null,
        lastSuccess: new Date().toISOString(),
        retryCount: 0
      }))

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Update connection state on error
      setConnection(prev => ({
        isOnline: false,
        lastError: error.message,
        lastSuccess: prev.lastSuccess,
        retryCount: prev.retryCount + 1
      }))
      
      throw error
    }
  }

  const testConnection = async () => {
    try {
      await apiCall('/ping')
      return true
    } catch (error) {
      return false
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Test connectivity first
      const isConnected = await testConnection()
      
      if (!isConnected) {
        throw new Error('Servidor não está acessível')
      }

      // Load dashboard stats
      const dashboardData = await apiCall('/admin/dashboard')
      setStats(dashboardData.stats || stats)
      setUsers(dashboardData.users || [])

      toast.success('Painel de administração carregado!')

    } catch (error) {
      console.error('Error loading dashboard:', error)
      setError('Erro ao carregar dados: ' + (error.message || 'Erro desconhecido'))
      
      // Set offline mode with fallback data
      setStats({
        totalUsers: 1,
        activeUsers: 1,
        systemStatus: 'offline'
      })
      setUsers([
        {
          id: 'admin',
          email: 'admin@vai.com.br',
          name: 'Administrador VAI',
          company: 'VAI System',
          plan: 'enterprise',
          createdAt: new Date().toISOString(),
          role: 'admin'
        }
      ])
    } finally {
      setLoading(false)
    }
  }


  const testHasDataApi = async () => {
    setTestingApi(true)
    try {
      console.log('🧪 Testing HasData API connection...')
      const result = await apiCall('/admin/test-api?type=hasdata', {
        method: 'POST'
      })

      if (result.success) {
        toast.success(`✅ Conexão HasData funcionando!\n\nStatus: ${result.details?.status}\n✓ API HasData operacional`, {
          duration: 6000
        })
      } else {
        toast.error(`❌ Erro na conexão\n\n${result.message}\nVerifique se a chave HasData está correta`, {
          duration: 8000
        })
      }
    } catch (error) {
      console.error('❌ Test error:', error)
      toast.error(`❌ Falha no teste: ${error.message}`, {
        duration: 6000
      })
    } finally {
      setTestingApi(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      loadDashboardData()
    }
  }, [accessToken])

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'basic': return 'bg-green-100 text-green-800'
      case 'free': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Conectando ao servidor...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-yellow-100 rounded-xl">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie usuários, configurações e monitore o sistema
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant={connection.isOnline ? "default" : "secondary"} className="gap-1 flex-1 sm:flex-initial justify-center">
            {connection.isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {connection.isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!connection.isOnline && (
        <Alert variant="default" className="border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-2">
              <p className="font-medium">Sistema em Modo Offline</p>
              <p className="text-sm">
                Edge Functions indisponíveis. Funcionalidades limitadas estão ativas.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Usuários Ativos</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Logados recentemente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Status do Sistema</CardTitle>
            {connection.isOnline ? (
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-xl sm:text-2xl font-bold ${connection.isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
              {connection.isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {connection.isOnline ? 'Serviços operacionais' : 'Modo local ativo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Ambiente</CardTitle>
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {connection.isOnline ? 'Produção' : 'Local'}
            </div>
            <p className="text-xs text-muted-foreground">
              Sistema adaptativo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              Informações do Sistema
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Status dos serviços e configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground text-xs sm:text-sm">App Name</p>
                  <p className="font-mono text-xs break-all">SaaS VAI</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground text-xs sm:text-sm">Backend Status</p>
                  <Badge variant={connection.isOnline ? "default" : "destructive"} className="text-xs">
                    {connection.isOnline ? 'Operacional' : 'Indisponível'}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground text-xs sm:text-sm">Autenticação</p>
                  <Badge variant={accessToken ? "default" : "destructive"} className="text-xs">
                    {accessToken ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground text-xs sm:text-sm">Armazenamento</p>
                  <Badge variant="default" className="text-xs">
                    Supabase
                  </Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <ConnectionStatus accessToken={accessToken} />
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Diagnóstico Avançado
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Tentativas de conexão: {connection.retryCount}</p>
                  <p>• Navegador online: {navigator.onLine ? 'Sim' : 'Não'}</p>
                  {connection.lastSuccess && (
                    <p>• Última conexão: {new Date(connection.lastSuccess).toLocaleString('pt-BR')}</p>
                  )}
                  <p>• Última verificação: {new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Lista de usuários cadastrados ({connection.isOnline ? 'dados em tempo real' : 'cache local'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full flex-shrink-0">
                    <span className="text-sm font-medium">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm sm:text-base truncate">{user.name}</p>
                      {user.role === 'admin' && <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                    {user.company && (
                      <p className="text-xs text-muted-foreground truncate">{user.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Badge className={`${getPlanColor(user.plan)} text-xs`}>
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                  </Badge>
                  {user.role === 'admin' && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Erro de Sistema</p>
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Reconectar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Wifi, WifiOff, Activity, AlertTriangle, Loader2, Bug, RefreshCw } from "lucide-react"

interface ConnectionStatusProps {
  accessToken?: string | null
}

export function ConnectionStatus({ accessToken }: ConnectionStatusProps) {
  const [status, setStatus] = useState<{
    state: 'loading' | 'online' | 'warning' | 'offline'
    message: string
    lastCheck: string | null
    debugInfo?: any
    canRetry: boolean
  }>({
    state: 'loading',
    message: 'Verificando conexão...',
    lastCheck: null,
    canRetry: true
  })

  const checkConnection = async () => {
    try {
      setStatus(prev => ({ ...prev, state: 'loading', message: 'Verificando...' }))
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const pingUrl = `${baseUrl}/ping`
      console.log('🔄 Testing connection to:', pingUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      try {
        console.log('📡 Making ping request...')
        const response = await fetch(pingUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        
        console.log('📡 Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json().catch(() => ({}))
          console.log('✅ Ping successful:', data)
          
          setStatus({
            state: 'online',
            message: 'Sistema Online',
            lastCheck: new Date().toLocaleTimeString('pt-BR'),
            canRetry: true,
            debugInfo: {
              status: response.status,
              data,
              url: pingUrl,
              timestamp: new Date().toISOString()
            }
          })
        } else {
          const errorText = await response.text().catch(() => '')
          console.log('⚠️ Server error response:', errorText)
          
          const debugInfo = {
            status: response.status,
            statusText: response.statusText,
            responseBody: errorText.substring(0, 500),
            url: pingUrl,
            timestamp: new Date().toISOString()
          }

          if (response.status === 401) {
            setStatus({
              state: 'warning',
              message: 'Não Autenticado',
              lastCheck: new Date().toLocaleTimeString('pt-BR'),
              debugInfo,
              canRetry: true
            })
          } else if (response.status === 404) {
            setStatus({
              state: 'warning',
              message: 'Endpoint Não Encontrado',
              lastCheck: new Date().toLocaleTimeString('pt-BR'),
              debugInfo,
              canRetry: true
            })
          } else {
            setStatus({
              state: 'warning',
              message: `Servidor Erro ${response.status}`,
              lastCheck: new Date().toLocaleTimeString('pt-BR'),
              debugInfo,
              canRetry: true
            })
          }
        }

      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        console.error('❌ Connection test failed:', fetchError)

        const debugInfo = {
          error: fetchError.message,
          name: fetchError.name,
          url: pingUrl,
          timestamp: new Date().toISOString(),
          hasAccessToken: !!accessToken
        }

        if (fetchError.name === 'AbortError') {
          setStatus({
            state: 'offline',
            message: 'Timeout na Conexão (8s)',
            lastCheck: new Date().toLocaleTimeString('pt-BR'),
            debugInfo,
            canRetry: true
          })
        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          setStatus({
            state: 'offline',
            message: 'Falha de Conectividade',
            lastCheck: new Date().toLocaleTimeString('pt-BR'),
            debugInfo,
            canRetry: true
          })
        } else {
          setStatus({
            state: 'offline',
            message: `Erro: ${fetchError.message.substring(0, 30)}`,
            lastCheck: new Date().toLocaleTimeString('pt-BR'),
            debugInfo,
            canRetry: true
          })
        }
      }

    } catch (error: any) {
      console.error('❌ Connection check failed:', error)
      setStatus({
        state: 'offline',
        message: 'Erro na Verificação',
        lastCheck: new Date().toLocaleTimeString('pt-BR'),
        debugInfo: {
          error: error.message,
          timestamp: new Date().toISOString()
        },
        canRetry: true
      })
    }
  }

  const showDebugInfo = () => {
    if (status.debugInfo) {
      console.log('🐛 Debug Info:', status.debugInfo)
      
      const debugText = `VAI Server Debug Information:

✅ URL: ${status.debugInfo.url || 'N/A'}
📊 Status: ${status.debugInfo.status || 'N/A'}
⚠️ Error: ${status.debugInfo.error || 'N/A'}
📄 Response: ${status.debugInfo.responseBody || JSON.stringify(status.debugInfo.data, null, 2) || 'N/A'}
🕒 Timestamp: ${status.debugInfo.timestamp}

Authentication:
🔑 Has Access Token: ${!!accessToken}

Troubleshooting:
${status.debugInfo.status === 401 ? '❌ Auth Issue: Access token required' : ''}
${status.debugInfo.status === 404 ? '❌ Endpoint Not Found: Check backend' : ''}
${status.debugInfo.error?.includes('fetch') ? '❌ Network Issue: Check internet connection' : ''}
${status.debugInfo.error?.includes('timeout') ? '❌ Timeout: Backend may be starting' : ''}

Resolution Steps:
1️⃣ Verify backend server is running
2️⃣ Check server logs
3️⃣ Test URL directly: ${status.debugInfo.url}
4️⃣ Verify access token is present`
      
      alert(debugText)
    } else {
      alert('No debug information available')
    }
  }

  useEffect(() => {
    checkConnection()
    // Check every 2 minutes
    const interval = setInterval(checkConnection, 120000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    switch (status.state) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case 'offline':
      default:
        return <WifiOff className="w-4 h-4 text-red-600" />
    }
  }

  const getStatusColor = () => {
    switch (status.state) {
      case 'online':
        return 'text-green-700'
      case 'warning':
        return 'text-yellow-700'
      case 'loading':
        return 'text-blue-700'
      case 'offline':
      default:
        return 'text-red-700'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Status da Conexão</span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {status.message}
        </span>
      </div>
      
      {status.lastCheck && (
        <div className="text-xs text-muted-foreground mb-2">
          Última verificação: {status.lastCheck}
        </div>
      )}
      
      {(status.state === 'offline' || status.state === 'warning') && (
        <Alert variant={status.state === 'offline' ? 'destructive' : 'default'} className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {status.state === 'offline' ? 'Conectividade Perdida' : 'Edge Function com Problemas'}
              </p>
              <p className="text-sm">
                {status.debugInfo?.status === 404 
                  ? "Edge Function não encontrada. Verifique se foi implantada corretamente."
                  : status.debugInfo?.status === 401 
                  ? "Edge Function requer configuração de autenticação."
                  : status.state === 'offline'
                  ? "Não foi possível conectar ao servidor Edge Function."
                  : "O sistema pode ter funcionalidade limitada."
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={status.state === 'loading' || !status.canRetry}
          className="flex-1 h-7 text-xs"
        >
          {status.state === 'loading' ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Verificar
            </>
          )}
        </Button>
        
        {status.debugInfo && (
          <Button
            variant="outline"
            size="sm"
            onClick={showDebugInfo}
            className="h-7 px-2"
            title="Mostrar informações de debug"
          >
            <Bug className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <div className="flex gap-1">
        <Badge 
          variant={status.state === 'online' ? "default" : "secondary"}
          className="text-xs"
        >
          {status.state === 'online' ? 'Conectado' : 'Limitado'}
        </Badge>
        <Badge 
          variant="secondary"
          className="text-xs"
        >
          Edge Functions
        </Badge>
      </div>
      
      <div className="text-xs text-muted-foreground/60">
        Backend: {status.debugInfo?.url ? new URL(status.debugInfo.url).hostname : 'Not available'}
      </div>
    </div>
  )
}
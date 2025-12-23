import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Loader2,
  Server,
  Database,
  Shield
} from "lucide-react"
import { getApiUrl } from '../utils/apiConfig'

export function AuthDiagnostics() {
  const baseUrl = getApiUrl()
  
  const [status, setStatus] = useState<{
    checking: boolean
    backendReachable: boolean
    lastCheck: Date | null
    errors: string[]
  }>({
    checking: true,
    backendReachable: false,
    lastCheck: null,
    errors: []
  })

  const runDiagnostics = async () => {
    setStatus(prev => ({ ...prev, checking: true, errors: [] }))
    const errors: string[] = []

    try {
      // Test 1: Check Laravel API
      console.log('🔍 Testing Laravel API...')
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`${baseUrl}/ping`, {
          method: 'GET',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          console.log('✅ Laravel API is reachable')
          setStatus(prev => ({ ...prev, backendReachable: true }))
        } else {
          errors.push(`Laravel API retornou status ${response.status}`)
          setStatus(prev => ({ ...prev, backendReachable: false }))
        }
      } catch (error) {
        console.error('❌ Laravel API test failed:', error)
        errors.push('Não foi possível alcançar o Laravel')
        setStatus(prev => ({ ...prev, backendReachable: false }))
      }

    } catch (error) {
      console.error('❌ Diagnostics failed:', error)
      errors.push('Erro geral no diagnóstico')
    }

    setStatus(prev => ({
      ...prev,
      checking: false,
      lastCheck: new Date(),
      errors
    }))
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const allOk = status.backendReachable
  const hasWarnings = false
  const allFailed = !status.backendReachable

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Status do Sistema</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={runDiagnostics}
          disabled={status.checking}
          className="h-7 text-xs"
        >
          {status.checking ? (
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
      </div>

      {!status.checking && (
        <>
          {allFailed && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Sem Conexão</AlertTitle>
              <AlertDescription>
                Não foi possível conectar ao Laravel. Verifique sua conexão com a internet e se o servidor está rodando.
              </AlertDescription>
            </Alert>
          )}

          {allOk && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Sistema Operacional</AlertTitle>
              <AlertDescription className="text-green-700">
                Backend Laravel está funcionando corretamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Laravel API</span>
              </div>
              {status.backendReachable ? (
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          {status.errors.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Problemas detectados:</p>
              {status.errors.map((error, index) => (
                <p key={index} className="text-destructive">• {error}</p>
              ))}
            </div>
          )}

          {status.lastCheck && (
            <div className="text-xs text-muted-foreground">
              Última verificação: {status.lastCheck.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </>
      )}

      {status.checking && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Verificando serviços...</p>
        </div>
      )}
    </div>
  )
}

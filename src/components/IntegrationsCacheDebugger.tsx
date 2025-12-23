import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function IntegrationsCacheDebugger() {
  const [cacheData, setCacheData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)

  const CACHE_KEYS = [
    'integrations_cache',
    'integrations_cache_meta',
    'integrations_whatsapp_connections'
  ]

  const loadCacheData = () => {
    setLoading(true)
    const data: Record<string, any> = {}
    
    CACHE_KEYS.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          data[key] = JSON.parse(value)
        } catch {
          data[key] = value
        }
      }
    })

    // Adicionar outras chaves dinâmicas
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.includes('integration') || 
        key.includes('connection') || 
        key.includes('whatsapp')
      ) && !CACHE_KEYS.includes(key)) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            data[key] = JSON.parse(value)
          } catch {
            data[key] = value
          }
        }
      }
    }

    setCacheData(data)
    setLoading(false)
  }

  const clearCacheKey = (key: string) => {
    if (confirm(`Tem certeza que deseja deletar "${key}"?`)) {
      localStorage.removeItem(key)
      toast.success(`✅ Cache "${key}" removido`)
      loadCacheData()
    }
  }

  const clearAllCache = () => {
    if (confirm('Tem certeza que deseja limpar TODO o cache de integrações? Isso será irreversível.')) {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('integration') || 
          key.includes('connection') || 
          key.includes('whatsapp')
        )) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      toast.success(`✅ ${keysToRemove.length} cache(s) removido(s)`)
      setCacheData(null)
      
      // Recarregar página após 1 segundo
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const removeConnection = (connectionId: string) => {
    if (confirm(`Remover conexão "${connectionId}"?`)) {
      const data = JSON.parse(localStorage.getItem('integrations_whatsapp_connections') || '[]')
      const filtered = data.filter((conn: any) => conn.id !== connectionId)
      localStorage.setItem('integrations_whatsapp_connections', JSON.stringify(filtered))
      
      toast.success(`✅ Conexão "${connectionId}" removida`)
      loadCacheData()
    }
  }

  return (
    <Card className="bg-yellow-50 border-yellow-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          Depurador de Cache de Integrações
        </CardTitle>
        <CardDescription>
          Ferramenta para diagnosticar e limpar problemas com instâncias presas no cache
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={loadCacheData}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Carregar Cache
          </Button>
          
          <Button
            onClick={clearAllCache}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Todo o Cache
          </Button>
        </div>

        {cacheData && Object.keys(cacheData).length > 0 ? (
          <div className="space-y-4 mt-4">
            <p className="text-sm font-semibold">Cache encontrado ({Object.keys(cacheData).length} chaves):</p>
            
            {Object.entries(cacheData).map(([key, value]) => (
              <div key={key} className="bg-white border border-yellow-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{key}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearCacheKey(key)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <details className="text-xs">
                  <summary className="cursor-pointer font-mono text-gray-600">
                    {typeof value === 'object' ? 'Ver detalhes...' : 'Valor'}
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-64 text-xs">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </details>

                {/* Controles específicos para conexões */}
                {key === 'integrations_whatsapp_connections' && Array.isArray(value) && (
                  <div className="mt-3 space-y-2 border-t border-yellow-200 pt-2">
                    {value.map((conn: any) => (
                      <div key={conn.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="text-xs">
                          <p className="font-semibold">{conn.name}</p>
                          <p className="text-gray-600">{conn.phone || conn.instance_name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeConnection(conn.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : loading ? (
          <p className="text-center text-gray-600">Carregando...</p>
        ) : cacheData !== null ? (
          <p className="text-center text-gray-600">Nenhum cache de integração encontrado</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

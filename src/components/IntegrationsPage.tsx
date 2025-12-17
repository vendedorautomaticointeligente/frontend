import { useState, useEffect } from "react"
import { Plus, Check, Loader, Trash2, QrCode } from "lucide-react"
import { Button } from "./ui/button"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"

type Connection = {
  id: string
  name: string
  phone?: string
  status: "pending_qr" | "connected" | "disconnected"
  instance_name: string
  connected_at?: string
  created_at: string
}

export default function IntegrationsPage() {
  const { accessToken } = useAuth()
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [pollAbort, setPollAbort] = useState<AbortController | null>(null)

  // Carregar conexões
  useEffect(() => {
    if (accessToken) {
      fetchConnections()
      
      // Polling a cada 5 segundos para verificar status
      const interval = setInterval(fetchConnections, 5000)
      return () => clearInterval(interval)
    }
  }, [accessToken, baseUrl])

  const fetchConnections = async () => {
    try {
      const response = await fetch(`${baseUrl}/integrations/connections`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConnections(data.data || [])
        setLoading(false)
      } else {
        toast.error("❌ Erro ao carregar conexões")
        setLoading(false)
      }
    } catch (error) {
      console.error("Erro ao carregar conexões:", error)
      toast.error("❌ Erro ao carregar conexões")
      setLoading(false)
    }
  }

  // Conectar novo WhatsApp
  const handleConnectWhatsApp = async () => {
    if (!accessToken) return

    setConnecting(true)
    try {
      const response = await fetch(`${baseUrl}/integrations/connect-whatsapp`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: `WhatsApp ${new Date().toLocaleDateString("pt-BR")}`
        })
      })

      const data = await response.json()

      if (response.ok && data.status === "success") {
        toast.success("✅ Instância criada! Escaneie o QR code")
        
        // Salvar para poll de QR code
        if (data.data?.qrcode) {
          setQrCode(data.data.qrcode)
          setSelectedConnectionId(data.data.connection_id)
        } else {
          // Se QR code não veio de primeira, começar a fazer polling
          setSelectedConnectionId(data.data?.connection_id)
          pollQrCode(data.data?.connection_id)
        }

        // Recarregar conexões
        await fetchConnections()
      } else {
        toast.error("❌ Erro ao conectar: " + (data.message || "Erro desconhecido"))
      }
    } catch (error) {
      toast.error("❌ Erro: " + (error instanceof Error ? error.message : "Erro desconhecido"))
    } finally {
      setConnecting(false)
    }
  }

  // Poll QR Code
  const pollQrCode = async (connectionId: string) => {
    // Cancelar qualquer poll anterior
    if (pollAbort) {
      pollAbort.abort()
    }
    
    const controller = new AbortController()
    setPollAbort(controller)
    setQrLoading(true)
    
    try {
      for (let i = 0; i < 60; i++) {
        if (controller.signal.aborted) {
          setQrLoading(false)
          return
        }

        const response = await fetch(`${baseUrl}/integrations/qrcode/${connectionId}`, {
          headers: { "Authorization": `Bearer ${accessToken}` },
          signal: controller.signal
        })

        const data = await response.json()

        if (data.data?.qrcode) {
          setQrCode(data.data.qrcode)
          setQrLoading(false)
          return
        }

        // Aguardar 2 segundos antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      toast.error("❌ Timeout ao obter QR code")
      setQrLoading(false)
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast.error("❌ Erro ao obter QR code: " + (error instanceof Error ? error.message : ""))
      }
      setQrLoading(false)
    }
  }

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (pollAbort) {
        pollAbort.abort()
      }
    }
  }, [pollAbort])

  // Desconectar WhatsApp
  const handleDisconnect = async (connectionId: string) => {
    if (!accessToken) return

    if (!confirm("Tem certeza que quer desconectar este WhatsApp?")) return

    try {
      const response = await fetch(`${baseUrl}/integrations/connections/${connectionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accessToken}` }
      })

      if (response.ok) {
        toast.success("✅ WhatsApp desconectado")
        await fetchConnections()
      } else {
        toast.error("❌ Erro ao desconectar")
      }
    } catch (error) {
      toast.error("❌ Erro: " + (error instanceof Error ? error.message : ""))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100"
      case "pending_qr":
        return "text-yellow-600 bg-yellow-100"
      case "disconnected":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "connected":
        return "✅ Conectado"
      case "pending_qr":
        return "⏳ Aguardando QR Code"
      case "disconnected":
        return "❌ Desconectado"
      default:
        return "⏳ Processando"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Integrações</h1>
          <p className="text-gray-600">Conecte seus números WhatsApp para começar a receber mensagens em tempo real</p>
        </div>

        {/* Connect Button */}
        <div className="mb-8">
          <Button
            onClick={handleConnectWhatsApp}
            disabled={connecting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold"
          >
            {connecting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Conectar WhatsApp
              </>
            )}
          </Button>
        </div>

        {/* QR Code Modal */}
        {selectedConnectionId && qrCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-center">Escaneie o QR Code</h2>
              
              <div className="bg-gray-100 p-4 rounded-lg mb-6 flex justify-center">
                {qrCode ? (
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64 object-contain"
                  />
                ) : (
                  <Loader className="w-16 h-16 animate-spin text-blue-600" />
                )}
              </div>

              <p className="text-center text-gray-600 mb-6">
                Use seu celular para escanear o código acima e conectar seu WhatsApp
              </p>

              <Button
                onClick={() => {
                  if (pollAbort) {
                    pollAbort.abort()
                  }
                  setSelectedConnectionId(null)
                  setQrCode(null)
                }}
                className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* QR Code Loading */}
        {selectedConnectionId && !qrCode && qrLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <Loader className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Gerando QR Code...</p>
            </div>
          </div>
        )}

        {/* Connections List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seus WhatsApps</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 mt-4">Carregando...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhum WhatsApp conectado</p>
              <p className="text-gray-500 text-sm mt-2">Clique em "Conectar WhatsApp" para começar</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{conn.name}</h3>
                      
                      <div className="mt-2 flex items-center gap-4">
                        {conn.phone && (
                          <p className="text-gray-600">
                            📱 {conn.phone}
                          </p>
                        )}
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(conn.status)}`}>
                          {getStatusLabel(conn.status)}
                        </span>
                      </div>

                      {conn.connected_at && (
                        <p className="text-gray-500 text-sm mt-2">
                          Conectado em {new Date(conn.connected_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>

                    {conn.status === "connected" && (
                      <Check className="w-8 h-8 text-green-600 mr-4" />
                    )}

                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Desconectar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

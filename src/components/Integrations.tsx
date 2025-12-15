import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuthLaravel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { MessageSquare, Phone, Instagram, Facebook, QrCode, Check, X, Loader2, AlertCircle, Zap, Plug, RefreshCw, Settings, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '../utils/formatters'
import { QRCodeCanvas } from './ui/qrcode'

interface Integration {
  id: string
  type: 'whatsapp' | 'facebook' | 'instagram' | 'voip'
  name: string
  status: 'connected' | 'disconnected' | 'pending'
  config: Record<string, any>
  connectedAt?: string
  lastSync?: string
}

export function Integrations() {
  const { accessToken } = useAuth()
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api'
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [whatsappConnections, setWhatsappConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
  // WhatsApp config states
  const [whatsappName, setWhatsappName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  
  // Facebook/Instagram config states
  const [facebookPageToken, setFacebookPageToken] = useState('')
  const [facebookPageId, setFacebookPageId] = useState('')
  const [instagramAccountId, setInstagramAccountId] = useState('')
  
  // VOIP config states
  const [voipProvider, setVoipProvider] = useState('twilio')
  const [voipAccountSid, setVoipAccountSid] = useState('')
  const [voipAuthToken, setVoipAuthToken] = useState('')
  const [voipPhoneNumber, setVoipPhoneNumber] = useState('')

  useEffect(() => {
    loadIntegrations()
    loadWhatsAppConnections()
  }, [])

  const loadWhatsAppConnections = async () => {
    try {
      const response = await fetch(`${baseUrl}/whatsapp/connections`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWhatsappConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error loading WhatsApp connections:', error)
    }
  }

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${baseUrl}/integrations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Error loading integrations:', error)
      toast.error('Erro ao carregar integrações')
    } finally {
      setLoading(false)
    }
  }

  const connectFacebookInstagram = async () => {
    try {
      setLoading(true)

      const response = await fetch(`${baseUrl}/integrations/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          facebookPageToken,
          facebookPageId,
          instagramAccountId
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Facebook/Instagram conectado com sucesso!')
        await loadIntegrations()
        
        // Reset form
        setFacebookPageToken('')
        setFacebookPageId('')
        setInstagramAccountId('')
      } else {
        toast.error(result.error || 'Erro ao conectar redes sociais')
      }
    } catch (error) {
      console.error('Error connecting social:', error)
      toast.error('Erro ao conectar redes sociais')
    } finally {
      setLoading(false)
    }
  }

  const connectVOIP = async () => {
    try {
      setLoading(true)

      const response = await fetch(`${baseUrl}/integrations/voip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          provider: voipProvider,
          accountSid: voipAccountSid,
          authToken: voipAuthToken,
          phoneNumber: voipPhoneNumber
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Telefone VOIP conectado com sucesso!')
        await loadIntegrations()
        
        // Reset form
        setVoipAccountSid('')
        setVoipAuthToken('')
        setVoipPhoneNumber('')
      } else {
        toast.error(result.error || 'Erro ao conectar telefone VOIP')
      }
    } catch (error) {
      console.error('Error connecting VOIP:', error)
      toast.error('Erro ao conectar telefone VOIP')
    } finally {
      setLoading(false)
    }
  }

  const disconnectIntegration = async (integrationId: string) => {
    try {
      const response = await fetch(`${baseUrl}/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        toast.success('Integração desconectada!')
        await loadIntegrations()
      } else {
        toast.error('Erro ao desconectar integração')
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      toast.error('Erro ao desconectar integração')
    }
  }

  const getIntegrationByType = (type: string) => {
    return integrations.find(i => i.type === type)
  }

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" /> Conectado</Badge>
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pendente</Badge>
      case 'disconnected':
      default:
        return <Badge variant="outline"><X className="w-3 h-3 mr-1" /> Desconectado</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const whatsappIntegration = getIntegrationByType('whatsapp')
  const facebookIntegration = getIntegrationByType('facebook')
  const instagramIntegration = getIntegrationByType('instagram')
  const voipIntegration = getIntegrationByType('voip')

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
              <Plug className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl">Integrações</h1>
              <p className="text-muted-foreground">
                Conecte canais de comunicação e automatize captação de leads
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>
                    Conecte seu número rapidamente gerando um QR Code abaixo
                  </CardDescription>
                </div>
              </div>
              {whatsappIntegration && getStatusBadge(whatsappIntegration.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappIntegration?.status === 'connected' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-900">WhatsApp Conectado</p>
                  </div>
                  <p className="text-sm text-green-700">
                    {whatsappIntegration.config.type === 'evolution' 
                      ? `Evolution API - Instância: ${whatsappIntegration.config.instance}`
                      : `API Oficial - Phone ID: ${whatsappIntegration.config.phoneId}`}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Conectado em: {formatDate(new Date(whatsappIntegration.connectedAt!))}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disconnectIntegration(whatsappIntegration.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Dialog open={showWhatsAppDialog} onOpenChange={(open) => {
                setShowWhatsAppDialog(open)
                if (!open) {
                  // Limpa ao fechar
                  setQrCode(null)
                  setSessionId(null)
                  setIsConnecting(false)
                  setWhatsappName('')
                  setWhatsappNumber('')
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Zap className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Conectar WhatsApp</DialogTitle>
                    <DialogDescription>
                      Preencha os dados abaixo para conectar seu WhatsApp
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    {!qrCode ? (
                      <>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="whatsapp-name">Nome da Conexão</Label>
                            <Input
                              id="whatsapp-name"
                              placeholder="Ex: Atendimento Vendas"
                              value={whatsappName}
                              onChange={(e) => setWhatsappName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="whatsapp-number">Número do WhatsApp</Label>
                            <Input
                              id="whatsapp-number"
                              placeholder="55 11 999999999"
                              value={whatsappNumber}
                              onChange={(e) => setWhatsappNumber(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Digite apenas números, com código do país e área (sem hífens ou parênteses)
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (!whatsappName || !whatsappNumber) {
                                toast.error('Preencha o nome e número da conexão')
                                return
                              }
                              
                              try {
                                setQrLoading(true)
                                
                                // Chama o backend para criar instância e gerar QR Code
                                const response = await fetch(`${baseUrl}/whatsapp/generate-qr`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`
                                  },
                                  body: JSON.stringify({
                                    number: whatsappNumber
                                  })
                                })

                                const result = await response.json()

                                // Se receber 202 com polling: true, faz polling
                                if (response.status === 202 && result.polling && result.sessionId) {
                                  setSessionId(result.sessionId)
                                  setIsConnecting(true)
                                  toast.info('Gerando QR Code... aguarde')
                                  
                                  // Polling para obter o QR Code
                                  let attempts = 0
                                  const maxAttempts = 40 // 40 * 1.5 segundos = 60 segundos
                                  
                                  const pollQr = setInterval(async () => {
                                    attempts++
                                    try {
                                      const pollResponse = await fetch(`${baseUrl}/whatsapp/poll-qr/${result.sessionId}`, {
                                        headers: {
                                          'Authorization': `Bearer ${accessToken}`
                                        }
                                      })
                                      
                                      const pollResult = await pollResponse.json()
                                      
                                      if (pollResult.qrCode) {
                                        // QR Code está pronto!
                                        clearInterval(pollQr)
                                        setQrCode(pollResult.qrCode)
                                        setQrLoading(false)
                                        toast.success('QR Code gerado! Escaneie com seu WhatsApp')
                                        
                                        // Continua polling para verificar se conectou
                                        const checkConnection = setInterval(async () => {
                                          try {
                                            const statusResponse = await fetch(`${baseUrl}/whatsapp/poll-qr/${result.sessionId}`, {
                                              headers: {
                                                'Authorization': `Bearer ${accessToken}`
                                              }
                                            })
                                            
                                            const statusResult = await statusResponse.json()
                                            
                                            if (statusResult.connected) {
                                              clearInterval(checkConnection)
                                              setIsConnecting(false)
                                              setShowWhatsAppDialog(false)
                                              toast.success('WhatsApp conectado com sucesso!')
                                              await loadIntegrations()
                                              await loadWhatsAppConnections()
                                              
                                              // Limpa form
                                              setWhatsappName('')
                                              setWhatsappNumber('')
                                              setQrCode(null)
                                              setSessionId(null)
                                            }
                                          } catch (error) {
                                            console.error('Error checking connection:', error)
                                          }
                                        }, 2000)
                                        
                                        // Para de verificar após 3 minutos
                                        setTimeout(() => clearInterval(checkConnection), 180000)
                                      } else if (attempts >= maxAttempts) {
                                        clearInterval(pollQr)
                                        setQrLoading(false)
                                        toast.error('Timeout ao gerar QR Code. Tente novamente.')
                                      }
                                    } catch (error) {
                                      console.error('Error polling QR code:', error)
                                    }
                                  }, 1500)
                                  
                                } else if (response.ok && result.qrCode) {
                                  // QR Code retornou imediatamente
                                  setQrCode(result.qrCode)
                                  setSessionId(result.sessionId)
                                  setIsConnecting(true)
                                  setQrLoading(false)
                                  toast.success('QR Code gerado! Escaneie com seu WhatsApp')
                                  
                                  // Polling para verificar se conectou
                                  const checkConnection = setInterval(async () => {
                                    try {
                                      const statusResponse = await fetch(`${baseUrl}/whatsapp/poll-qr/${result.sessionId}`, {
                                        headers: {
                                          'Authorization': `Bearer ${accessToken}`
                                        }
                                      })
                                      
                                      const statusResult = await statusResponse.json()
                                      
                                      if (statusResult.connected) {
                                        clearInterval(checkConnection)
                                        setIsConnecting(false)
                                        setShowWhatsAppDialog(false)
                                        toast.success('WhatsApp conectado com sucesso!')
                                        await loadIntegrations()
                                        await loadWhatsAppConnections()
                                        
                                        // Limpa form
                                        setWhatsappName('')
                                        setWhatsappNumber('')
                                        setQrCode(null)
                                        setSessionId(null)
                                      }
                                    } catch (error) {
                                      console.error('Error checking connection:', error)
                                    }
                                  }, 2000)
                                  
                                  // Para de verificar após 3 minutos
                                  setTimeout(() => clearInterval(checkConnection), 180000)
                                } else {
                                  setQrLoading(false)
                                  toast.error(result.error || 'Erro ao gerar QR Code')
                                }
                              } catch (error) {
                                console.error('Error generating QR code:', error)
                                toast.error('Erro ao gerar QR Code')
                                setQrLoading(false)
                              }
                            }}
                            disabled={!whatsappName || !whatsappNumber || qrLoading}
                            className="flex-1"
                          >
                            {qrLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <QrCode className="w-4 h-4 mr-2" />
                                Gerar QR Code
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="w-5 h-5 text-green-600" />
                            <p className="font-medium text-green-900">Como Conectar</p>
                          </div>
                          <p className="text-sm text-green-700">
                            1. Abra o WhatsApp no celular<br />
                            2. Toque em <strong>Mais opções</strong> (⋮) → <strong>Aparelhos conectados</strong><br />
                            3. Toque em <strong>Conectar um aparelho</strong><br />
                            4. Escaneie o QR Code abaixo
                          </p>
                        </div>

                        <div className="p-6 border-2 border-green-500 rounded-lg bg-white">
                          <div className="flex justify-center mb-4">
                            <QRCodeCanvas 
                              value={qrCode} 
                              size={280} 
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          {isConnecting && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Aguardando leitura do QR Code...
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setQrCode(null)
                              setSessionId(null)
                              setIsConnecting(false)
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Gerar Novo QR Code
                          </Button>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Nota:</strong> O QR Code expira em 60 segundos. Se expirar, clique em "Gerar Novo QR Code".
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-800">
                <p className="font-medium">Como funcionam as integrações?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>WhatsApp:</strong> Receba e envie mensagens automaticamente</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  As credenciais são armazenadas de forma segura e criptografada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
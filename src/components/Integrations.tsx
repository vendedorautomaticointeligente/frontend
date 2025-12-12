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
import { toast } from 'sonner@2.0.3'
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
                    Conecte via Evolution API (QR Code) ou API Oficial
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
                    Conectado em: {new Date(whatsappIntegration.connectedAt!).toLocaleString('pt-BR')}
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
                          placeholder="(11) 99999-9999"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-green-900">Como Conectar</p>
                      </div>
                      <p className="text-sm text-green-700">
                        1. Preencha o nome e número acima<br />
                        2. Clique em "Gerar QR Code"<br />
                        3. Abra o WhatsApp no celular<br />
                        4. Toque em <strong>Mais opções</strong> (⋮) → <strong>Aparelhos conectados</strong><br />
                        5. Toque em <strong>Conectar um aparelho</strong><br />
                        6. Escaneie o QR Code abaixo
                      </p>
                    </div>

                    {qrCode && (
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
                    )}

                    <div className="flex gap-2">
                      {!qrCode ? (
                        <Button
                          onClick={async () => {
                            if (!whatsappName || !whatsappNumber) {
                              toast.error('Preencha o nome e número da conexão')
                              return
                            }
                            
                            try {
                              setQrLoading(true)
                              
                              // Chama o backend para gerar QR Code REAL
                              const response = await fetch(`${baseUrl}/whatsapp/generate-qr`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${accessToken}`
                                },
                                body: JSON.stringify({
                                  name: whatsappName,
                                  number: whatsappNumber
                                })
                              })

                              const result = await response.json()

                              if (response.ok && result.qrCode) {
                                setQrCode(result.qrCode)
                                setSessionId(result.sessionId)
                                setIsConnecting(true)
                                toast.success('QR Code gerado! Escaneie com seu WhatsApp')
                                
                                // Polling para verificar se conectou
                                const checkConnection = setInterval(async () => {
                                  const statusResponse = await fetch(`${baseUrl}/whatsapp/check-connection/${result.sessionId}`, {
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
                                }, 3000) // Verifica a cada 3 segundos
                                
                                // Para de verificar após 2 minutos
                                setTimeout(() => clearInterval(checkConnection), 120000)
                              } else {
                                toast.error(result.error || 'Erro ao gerar QR Code')
                              }
                            } catch (error) {
                              console.error('Error generating QR code:', error)
                              toast.error('Erro ao gerar QR Code')
                            } finally {
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
                      ) : (
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
                      )}
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Nota:</strong> O QR Code expira em 60 segundos. Se expirar, clique em "Gerar Novo QR Code".
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Facebook / Instagram Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <Facebook className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Facebook & Instagram</CardTitle>
                  <CardDescription>
                    Capture leads de comentários, DMs e Messenger automaticamente
                  </CardDescription>
                </div>
              </div>
              {(facebookIntegration || instagramIntegration) && 
                getStatusBadge(facebookIntegration?.status || instagramIntegration?.status || 'disconnected')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {facebookIntegration?.status === 'connected' || instagramIntegration?.status === 'connected' ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-blue-600" />
                    <p className="font-medium text-blue-900">Redes Sociais Conectadas</p>
                  </div>
                  {facebookIntegration && (
                    <p className="text-sm text-blue-700">
                      Facebook Page ID: {facebookIntegration.config.pageId}
                    </p>
                  )}
                  {instagramIntegration && (
                    <p className="text-sm text-blue-700">
                      Instagram Account ID: {instagramIntegration.config.accountId}
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">
                    Conectado em: {new Date((facebookIntegration || instagramIntegration)?.connectedAt!).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (facebookIntegration) disconnectIntegration(facebookIntegration.id)
                    if (instagramIntegration) disconnectIntegration(instagramIntegration.id)
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Instagram className="w-4 h-4 mr-2" />
                    Conectar Facebook & Instagram
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Conectar Facebook & Instagram</DialogTitle>
                    <DialogDescription>
                      Configure suas páginas e contas para capturar leads automaticamente
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Importante:</strong> Você precisa ter uma página no Facebook e/ou conta Business no Instagram.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fb-token">Facebook Page Access Token</Label>
                      <Textarea
                        id="fb-token"
                        placeholder="Cole aqui o token de acesso da sua página"
                        value={facebookPageToken}
                        onChange={(e) => setFacebookPageToken(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fb-page">Facebook Page ID</Label>
                      <Input
                        id="fb-page"
                        placeholder="123456789012345"
                        value={facebookPageId}
                        onChange={(e) => setFacebookPageId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ig-account">Instagram Account ID (Opcional)</Label>
                      <Input
                        id="ig-account"
                        placeholder="123456789012345"
                        value={instagramAccountId}
                        onChange={(e) => setInstagramAccountId(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={connectFacebookInstagram}
                      disabled={!facebookPageToken || !facebookPageId}
                      className="w-full"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Conectar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* VOIP Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Telefone VOIP</CardTitle>
                  <CardDescription>
                    Configure ligações automáticas via Twilio ou outro provedor
                  </CardDescription>
                </div>
              </div>
              {voipIntegration && getStatusBadge(voipIntegration.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {voipIntegration?.status === 'connected' ? (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-purple-600" />
                    <p className="font-medium text-purple-900">Telefone VOIP Conectado</p>
                  </div>
                  <p className="text-sm text-purple-700">
                    Provedor: {voipIntegration.config.provider.toUpperCase()}
                  </p>
                  <p className="text-sm text-purple-700">
                    Número: {voipIntegration.config.phoneNumber}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Conectado em: {new Date(voipIntegration.connectedAt!).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disconnectIntegration(voipIntegration.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Conectar Telefone VOIP
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Conectar Telefone VOIP</DialogTitle>
                    <DialogDescription>
                      Configure seu provedor VOIP para fazer ligações automáticas
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="voip-provider">Provedor VOIP</Label>
                      <Select value={voipProvider} onValueChange={setVoipProvider}>
                        <SelectTrigger id="voip-provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="vonage">Vonage</SelectItem>
                          <SelectItem value="plivo">Plivo</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voip-sid">Account SID / ID</Label>
                      <Input
                        id="voip-sid"
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={voipAccountSid}
                        onChange={(e) => setVoipAccountSid(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voip-token">Auth Token / API Key</Label>
                      <Input
                        id="voip-token"
                        type="password"
                        placeholder="Seu token de autenticação"
                        value={voipAuthToken}
                        onChange={(e) => setVoipAuthToken(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voip-phone">Número de Telefone</Label>
                      <Input
                        id="voip-phone"
                        placeholder="+5511999999999"
                        value={voipPhoneNumber}
                        onChange={(e) => setVoipPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={connectVOIP}
                      disabled={!voipAccountSid || !voipAuthToken || !voipPhoneNumber}
                      className="w-full"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Conectar VOIP
                    </Button>
                  </DialogFooter>
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
                  <li><strong>Facebook/Instagram:</strong> Cada comentário, DM ou mensagem no Messenger vira um lead automaticamente</li>
                  <li><strong>Telefone VOIP:</strong> Faça ligações automáticas para seus leads</li>
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
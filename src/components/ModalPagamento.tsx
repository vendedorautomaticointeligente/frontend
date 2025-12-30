import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Loader2, Copy, Check, AlertCircle, CreditCard, QrCode } from "lucide-react"
import { toast } from "sonner"
import { getToken } from "../utils/tokenManager"

interface User {
  id: string
  email: string
  name: string
  last_name?: string
  cpf?: string
  date_of_birth?: string
  whatsapp?: string
  company?: string
}

interface ModalPagamentoProps {
  isOpen: boolean
  onClose: () => void
  planId: string
  planName: string
  planPrice: number
  user?: User
  onPaymentSuccess?: (plan: string) => void
}

export function ModalPagamento({ isOpen, onClose, planId, planName, planPrice, user }: ModalPagamentoProps) {
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'method' | 'data' | 'processing' | 'success'>('method')
  
  // Dados do formulário pré-preenchidos
  const [customerData, setCustomerData] = useState({
    name: '',
    last_name: '',
    email: '',
    cpf: '',
    date_of_birth: '',
    whatsapp: ''
  })

  const token = getToken()

  // Converter data de YYYY-MM-DD para formato exibição
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

  // Pré-preencher dados do usuário
  useEffect(() => {
    if (user) {
      setCustomerData({
        name: user.name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        cpf: user.cpf || '',
        date_of_birth: formatDateToInput(user.date_of_birth),
        whatsapp: user.whatsapp || ''
      })
    }
  }, [user, isOpen])

  // Helper para obter URL da API sem duplicação de /api
  const getApiUrl = () => {
    let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    // Remover /api do final se existir
    baseUrl = baseUrl.replace(/\/api\/?$/, '')
    return baseUrl
  }

  const handleCreateCharge = async () => {
    setLoading(true)
    try {
      console.log('📤 Enviando payload:', {
        plan: planId,
        billing_type: billingType,
        customer: customerData,
        token: token ? '✅ presente' : '❌ faltando'
      })

      const response = await fetch(`${getApiUrl()}/api/payments/create-charge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: planId,
          billing_type: billingType,
          customer_name: customerData.name,
          customer_last_name: customerData.last_name,
          customer_email: customerData.email,
          customer_cpf: customerData.cpf,
          customer_date_of_birth: customerData.date_of_birth,
          customer_whatsapp: customerData.whatsapp
        })
      })

      console.log('📥 Response status:', response.status)
      const data = await response.json()
      console.log('📥 Response data:', data)

      if (!response.ok) {
        console.error('❌ Erro ao criar cobrança:', {
          status: response.status,
          response: data
        })
        
        // Se houver erros de validação (422), mostrar os erros
        if (response.status === 422 && data.errors) {
          const errorMessages = Object.values(data.errors)
            .flat()
            .join(', ')
          toast.error('Erro: ' + errorMessages)
        } else {
          toast.error('Erro ao criar cobrança: ' + (data.message || 'Tente novamente'))
        }
        setLoading(false)
        return
      }

      if (!data.success) {
        toast.error('Erro ao criar cobrança: ' + (data.message || 'Tente novamente'))
        setLoading(false)
        return
      }

      setChargeId(data.charge_id)
      
      if (billingType === 'PIX' && data.pix_qr_code) {
        setPixQrCode(data.pix_qr_code)
        setPixCopyPaste(data.pix_copy_paste)
      }

      setPaymentStep('processing')
      toast.success('Cobrança criada! Proceda com o pagamento.')

      // Se for PIX, começar a monitorar o pagamento
      if (billingType === 'PIX') {
        monitorPixPayment(data.charge_id)
      }
    } catch (error) {
      toast.error('Erro ao processar pagamento')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const monitorPixPayment = (chargeId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/payments/charge/${chargeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.charge && (data.charge.status === 'RECEIVED' || data.charge.status === 'CONFIRMED')) {
          clearInterval(interval)
          await confirmPayment(chargeId)
        }
      } catch (error) {
        console.error('Erro ao monitorar pagamento:', error)
      }
    }, 5000) // Verificar a cada 5 segundos

    // Parar de monitorar após 30 minutos
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000)
  }

  const confirmPayment = async (chargeId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          charge_id: chargeId,
          plan: planId
        })
      })

      const data = await response.json()

      if (data.success) {
        setPaymentStep('success')
        toast.success('Pagamento confirmado! Plano ativado com sucesso!')
        
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 3000)
      } else {
        toast.error('Erro ao confirmar pagamento')
      }
    } catch (error) {
      toast.error('Erro ao confirmar pagamento')
      console.error(error)
    }
  }

  const copyPixCode = () => {
    if (pixCopyPaste) {
      navigator.clipboard.writeText(pixCopyPaste)
      setCopied(true)
      toast.success('Código PIX copiado!')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Upgrade</DialogTitle>
          <DialogDescription>
            Upgrade para o plano {planName}
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'method' && (
          <div className="space-y-6">
            {/* Plan Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{planName}</span>
                <Badge>R$ {planPrice}/mês</Badge>
              </div>
            </Card>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <p className="font-semibold text-sm">Selecione a forma de pagamento:</p>
              
              <div
                onClick={() => setBillingType('PIX')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  billingType === 'PIX'
                    ? 'border-vai-blue-tech bg-vai-blue-light/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-sm">PIX</p>
                    <p className="text-xs text-muted-foreground">Instantâneo</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setBillingType('CREDIT_CARD')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  billingType === 'CREDIT_CARD'
                    ? 'border-vai-blue-tech bg-vai-blue-light/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-sm">Cartão de Crédito</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={() => setPaymentStep('data')} 
                disabled={loading}
                className="flex-1 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {paymentStep === 'data' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="modal-name" className="text-sm">Nome</Label>
                <Input
                  id="modal-name"
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  disabled={loading}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-last-name" className="text-sm">Sobrenome</Label>
                <Input
                  id="modal-last-name"
                  type="text"
                  value={customerData.last_name}
                  onChange={(e) => setCustomerData({...customerData, last_name: e.target.value})}
                  disabled={loading}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-email" className="text-sm">Email</Label>
              <Input
                id="modal-email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                disabled={loading}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-cpf" className="text-sm">CPF</Label>
              <Input
                id="modal-cpf"
                type="text"
                placeholder="XXX.XXX.XXX-XX"
                value={customerData.cpf}
                onChange={(e) => setCustomerData({...customerData, cpf: e.target.value})}
                disabled={loading}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-dob" className="text-sm">Data de Nascimento</Label>
              <Input
                id="modal-dob"
                type="date"
                value={customerData.date_of_birth}
                onChange={(e) => setCustomerData({...customerData, date_of_birth: e.target.value})}
                disabled={loading}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-whatsapp" className="text-sm">WhatsApp</Label>
              <Input
                id="modal-whatsapp"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={customerData.whatsapp}
                onChange={(e) => setCustomerData({...customerData, whatsapp: e.target.value})}
                disabled={loading}
                className="h-10 text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPaymentStep('method')} 
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleCreateCharge} 
                disabled={loading}
                className="flex-1 bg-vai-blue-tech hover:bg-vai-blue-tech/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Pagamento'
                )}
              </Button>
            </div>
          </div>
        )}

        {paymentStep === 'processing' && billingType === 'PIX' && (
          <div className="space-y-6">
            {/* QR Code */}
            {pixQrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <img 
                    src={`data:image/png;base64,${pixQrCode}`} 
                    alt="PIX QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Escaneie o código com seu banco ou carteira digital
                </p>
              </div>
            )}

            {/* Copy Paste */}
            {pixCopyPaste && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Ou copie o código:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={pixCopyPaste} 
                    readOnly 
                    className="flex-1 px-3 py-2 border rounded text-sm font-mono text-xs"
                  />
                  <Button 
                    onClick={copyPixCode}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Waiting Message */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Aguardando confirmação</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Estamos monitorando seu pagamento. Assim que for confirmado, seu plano será ativado automaticamente.
                  </p>
                </div>
              </div>
            </Card>

            {/* Cancel Button */}
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {paymentStep === 'processing' && billingType === 'CREDIT_CARD' && (
          <div className="space-y-4">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-amber-900">Redirecionando para pagamento</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Você será redirecionado para a página segura de pagamento do Asaas.
                  </p>
                </div>
              </div>
            </Card>
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Pagamento Confirmado!</h3>
              <p className="text-sm text-green-700 mt-2">
                Seu plano {planName} foi ativado com sucesso.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              A página será recarregada em breve...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

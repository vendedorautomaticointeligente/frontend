import { Check, Zap, Crown, Sparkles, Building2, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { ModalPagamento } from "./ModalPagamento"
import { useAuth } from "../hooks/useAuthLaravel"
import { getToken } from "../utils/tokenManager"
import { toast } from "sonner"

type Plan = {
  id: string
  name: string
  price: string
  description: string
  icon?: any
  badge?: string
  badgeColor?: string
  features: string[]
  highlighted?: boolean
  max_contacts_per_month?: number
  max_connected_numbers?: number
  max_ai_agents?: number
  max_automations?: number
  max_campaigns_per_month?: number
  max_concurrent_calls?: number
}

export function PlansPage() {
  const { user } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('trial')
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)

  useEffect(() => {
    // Buscar plano atual do usuário
    const fetchCurrentPlan = async () => {
      try {
        const token = getToken()
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
        const response = await fetch(`${baseUrl}/api/payments/subscription`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        if (data.success && data.plan) {
          setCurrentPlan(data.plan)
        }
      } catch (error) {
        console.error('Erro ao buscar plano atual:', error)
      }
    }

    if (user) {
      fetchCurrentPlan()
    }
  }, [user])

  useEffect(() => {
    // Buscar planos disponíveis da API
    const fetchAvailablePlans = async () => {
      try {
        setIsLoadingPlans(true)
        const token = getToken()
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
        const response = await fetch(`${baseUrl}/api/payments/available-plans`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        
        if (data.success && data.plans) {
          // Mapear dados da API para o formato de UI com icons e badges
          const plansWithUI = data.plans.map((plan: any) => {
            let icon = Zap
            let badge = undefined
            let badgeColor = undefined
            let highlighted = false

            if (plan.id === 'basic') {
              icon = Sparkles
              badge = 'MAIS POPULAR'
              badgeColor = 'bg-vai-blue-tech text-white'
              highlighted = true
            } else if (plan.id === 'advanced') {
              icon = Crown
            } else if (plan.id === 'intermediate') {
              icon = Building2
            } else if (plan.id === 'trial') {
              badge = 'TESTE GRÁTIS'
              badgeColor = 'bg-vai-green-ai text-white'
            } else if (plan.id === 'custom') {
              icon = Crown
              badge = 'ENTERPRISE'
              badgeColor = 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
            }

            // Construir features baseado nos limites
            const features = [
              `${plan.max_contacts_per_month === null ? 'Contatos sob demanda' : plan.max_contacts_per_month.toLocaleString('pt-BR') + ' contatos'}`,
              `${plan.max_connected_numbers === null ? 'Números sob consulta' : plan.max_connected_numbers + ' número' + (plan.max_connected_numbers !== 1 ? 's' : '') + ' conectado' + (plan.max_connected_numbers !== 1 ? 's' : '')}`,
              `${plan.max_ai_agents === null ? 'Agentes sob consulta' : plan.max_ai_agents + ' agente' + (plan.max_ai_agents !== 1 ? 's' : '') + ' IA'}`,
              `${plan.max_campaigns_per_month === null ? 'Campanhas sob consulta' : plan.max_campaigns_per_month + ' campanha' + (plan.max_campaigns_per_month !== 1 ? 's' : '') + '/mês'}`,
              `${plan.max_concurrent_calls === null ? 'SLA e suporte dedicado' : plan.max_concurrent_calls.toLocaleString('pt-BR') + ' Atendimentos simultâneos com IA'}`
            ]

            return {
              ...plan,
              icon,
              badge,
              badgeColor,
              highlighted,
              features
            }
          })

          setAvailablePlans(plansWithUI)
        }
      } catch (error) {
        console.error('Erro ao buscar planos disponíveis:', error)
        toast.error('Erro ao carregar planos')
      } finally {
        setIsLoadingPlans(false)
      }
    }

    if (user) {
      fetchAvailablePlans()
    }
  }, [user])

  const handleUpgradeClick = (planId: string) => {
    if (planId === currentPlan) {
      return // Já tem esse plano
    }
    setSelectedPlan(planId)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <Badge className="mb-4 bg-vai-blue-light text-vai-blue-tech border-vai-blue-tech/20">
              PLANOS E PREÇOS
            </Badge>
            <h1 className="text-4xl text-vai-text-primary mb-3">
              Escolha o plano ideal para seu negócio
            </h1>
            <p className="text-lg text-vai-text-secondary max-w-2xl mx-auto">
              Automatize suas vendas com inteligência artificial
            </p>
          </div>
        </div>
      </div>

      {/* Plans Container */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        
        {isLoadingPlans ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <p className="text-vai-text-secondary">Carregando planos...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Regular Plans Grid - 5 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {availablePlans.filter(p => p.id !== 'custom').map((plan) => {
                const Icon = plan.icon || Zap
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col p-6 ${
                      plan.highlighted 
                        ? 'border-2 border-vai-blue-tech shadow-xl' 
                        : 'border border-gray-200 hover:shadow-lg transition-shadow'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className={`${plan.badgeColor} px-3 py-1 text-xs whitespace-nowrap`}>
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      plan.highlighted 
                        ? 'bg-vai-blue-tech text-white' 
                        : 'bg-vai-blue-light text-vai-blue-tech'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-lg text-vai-text-primary mb-2">
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-2xl text-vai-blue-tech">
                        {plan.price}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-vai-text-secondary mb-6 min-h-[60px]">
                      {plan.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            plan.highlighted ? 'text-vai-blue-tech' : 'text-green-600'
                          }`} />
                          <span className="text-vai-text-secondary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <div className="space-y-2">
                      {currentPlan === plan.id && (
                        <Badge className="w-full justify-center bg-green-100 text-green-800 border-green-300">
                          ✓ Plano Atual
                        </Badge>
                      )}
                      <Button 
                        onClick={() => handleUpgradeClick(plan.id)}
                        disabled={currentPlan === plan.id}
                        className={`w-full ${
                          currentPlan === plan.id
                            ? 'bg-gray-300 cursor-default'
                            : plan.highlighted 
                            ? 'bg-vai-blue-tech hover:bg-vai-blue-tech/90 text-white' 
                            : plan.id === 'trial'
                            ? 'bg-vai-green-ai hover:bg-vai-green-ai/90 text-white'
                            : 'bg-white hover:bg-gray-50 text-vai-blue-tech border-2 border-vai-blue-tech'
                        }`}
                      >
                        {plan.id === 'trial' ? 'Começar Grátis' : currentPlan === plan.id ? 'Plano Atual' : 'Assinar Agora'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Enterprise Plan - Horizontal Card */}
            {availablePlans.find(p => p.id === 'custom') && (
              <Card className="relative border-2 border-gradient-to-r from-yellow-500 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
                
                <div className="relative p-8">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* Left Side - Info */}
                    <div className="space-y-6">
                      <div>
                        <Badge className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white mb-4`}>
                          ENTERPRISE
                        </Badge>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                            <Crown className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl text-vai-text-primary">
                              PERSONALIZADO
                            </h3>
                            <p className="text-3xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                              Sob Consulta
                            </p>
                          </div>
                        </div>

                        <p className="text-vai-text-secondary">
                          Para operações de grande escala, com necessidades específicas e volume customizado.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <a
                          href="https://wa.me/5511960730881?text=Olá%20Murilo%2C%20quero%20um%20plano%20personalizado%20do%20VAI!"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <Button 
                            size="lg"
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white w-full"
                          >
                            Falar com Vendas
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </a>
                      </div>
                    </div>

                    {/* Right Side - Features Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {availablePlans.find(p => p.id === 'custom')?.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
                          <span className="text-sm text-vai-text-secondary">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Modal de Pagamento */}
            {selectedPlan && (
              <ModalPagamento 
                isOpen={isModalOpen}
                onClose={() => {
                  setIsModalOpen(false)
                  setSelectedPlan(null)
                }}
                planId={selectedPlan}
                planName={availablePlans.find(p => p.id === selectedPlan)?.name || 'Plano'}
                planPrice={parseInt(availablePlans.find(p => p.id === selectedPlan)?.price.replace(/[^0-9]/g, '') || '0')}
                user={user}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
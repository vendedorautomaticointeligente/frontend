import { Check, Zap, Crown, Sparkles, Building2, ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

type Plan = {
  id: string
  name: string
  price: string
  description: string
  icon: any
  badge?: string
  badgeColor?: string
  features: string[]
  highlighted?: boolean
}

const regularPlans: Plan[] = [
  {
    id: 'trial',
    name: 'TRIAL',
    price: 'Gratuito',
    description: 'Teste a plataforma e conheça as funcionalidades básicas.',
    icon: Zap,
    badge: 'TESTE GRÁTIS',
    badgeColor: 'bg-vai-green-ai text-white',
    features: [
      '100 contatos',
      '1 número conectado',
      '0 agentes IA',
      '0 automações',
      '1 campanha',
      '0 Atendimentos simultâneos com IA'
    ]
  },
  {
    id: 'start',
    name: 'START',
    price: 'R$ 99/mês',
    description: 'Para quem está começando a automatizar prospecção e atendimento.',
    icon: Zap,
    features: [
      '1.000 contatos/mês',
      '1 número conectado',
      '1 agente IA',
      '1 automação',
      '3 campanhas/mês',
      '100 Atendimentos simultâneos com IA'
    ]
  },
  {
    id: 'basic',
    name: 'BÁSICO',
    price: 'R$ 249/mês',
    description: 'Para empresas pequenas que já possuem operação comercial ativa.',
    icon: Sparkles,
    badge: 'MAIS POPULAR',
    badgeColor: 'bg-vai-blue-tech text-white',
    highlighted: true,
    features: [
      '3.000 contatos/mês',
      '3 números conectados',
      '3 agentes IA',
      '3 automações',
      '3 campanhas/mês',
      '300 Atendimentos simultâneos com IA'
    ]
  },
  {
    id: 'intermediate',
    name: 'INTERMEDIÁRIO',
    price: 'R$ 499/mês',
    description: 'Para quem precisa escalar prospecção, atendimento e follow-up.',
    icon: Building2,
    features: [
      '5.000 contatos/mês',
      '5 números conectados',
      '5 agentes IA',
      '5 automações',
      '5 campanhas/mês',
      '500 Atendimentos simultâneos com IA'
    ]
  },
  {
    id: 'advanced',
    name: 'AVANÇADO',
    price: 'R$ 999/mês',
    description: 'Para empresas que operam alto volume e múltiplos fluxos comerciais.',
    icon: Crown,
    features: [
      '10.000 contatos/mês',
      '10 números conectados',
      '10 agentes IA',
      '10 automações',
      '10 campanhas/mês',
      '1000 Atendimentos simultâneos com IA'
    ]
  }
]

const enterprisePlan: Plan = {
  id: 'custom',
  name: 'PERSONALIZADO',
  price: 'Sob Consulta',
  description: 'Para operações de grande escala, com necessidades específicas e volume customizado.',
  icon: Crown,
  badge: 'ENTERPRISE',
  badgeColor: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
  features: [
    'Contatos sob demanda',
    'Números ilimitados',
    'Agentes ilimitados',
    'Automações ilimitadas',
    'Campanhas ilimitadas',
    'SLA e suporte dedicado',
    'Gerente de contas exclusivo'
  ]
}

export function PlansPage() {
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
        
        {/* Regular Plans Grid - 5 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {regularPlans.map((plan) => {
            const Icon = plan.icon
            
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
                <Button 
                  className={`w-full ${
                    plan.highlighted 
                      ? 'bg-vai-blue-tech hover:bg-vai-blue-tech/90 text-white' 
                      : plan.id === 'trial'
                      ? 'bg-vai-green-ai hover:bg-vai-green-ai/90 text-white'
                      : 'bg-white hover:bg-gray-50 text-vai-blue-tech border-2 border-vai-blue-tech'
                  }`}
                >
                  {plan.id === 'trial' ? 'Começar Grátis' : 'Assinar Agora'}
                </Button>
              </Card>
            )
          })}
        </div>

        {/* Enterprise Plan - Horizontal Card */}
        <Card className="relative border-2 border-gradient-to-r from-yellow-500 to-orange-500 bg-gradient-to-br from-yellow-50 to-orange-50 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
          
          <div className="relative p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Side - Info */}
              <div className="space-y-6">
                <div>
                  <Badge className={`${enterprisePlan.badgeColor} mb-4`}>
                    {enterprisePlan.badge}
                  </Badge>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl text-vai-text-primary">
                        {enterprisePlan.name}
                      </h3>
                      <p className="text-3xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        {enterprisePlan.price}
                      </p>
                    </div>
                  </div>

                  <p className="text-vai-text-secondary">
                    {enterprisePlan.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    Falar com Vendas
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    Ver Demonstração
                  </Button>
                </div>
              </div>

              {/* Right Side - Features Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {enterprisePlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
                    <span className="text-sm text-vai-text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
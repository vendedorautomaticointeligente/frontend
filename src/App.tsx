import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuthLaravel"
import { AuthForm } from "./components/AuthForm"
import { AdminPanel } from "./components/AdminPanel"
import { ListGeneratorB2B } from "./components/ListGeneratorB2B"
import { ListGeneratorB2C } from "./components/ListGeneratorB2C"
import { CRMPage } from "./components/CRMPage"
import { Agents } from "./components/Agents"
import { CampaignsPage } from "./components/CampaignsPage"
import { CreateCampaignPage } from "./components/CreateCampaignPage"
import { CampaignStatsPage } from "./components/campaigns/CampaignStatsPage"
import { Automations } from "./components/Automations"
import { AccountSettings } from "./components/AccountSettings"
import { Integrations } from "./components/Integrations"
import { ConversationsPage } from "./components/ConversationsPage_v2_simplified"
import { PlansPage } from "./components/PlansPage"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar"
import { Button } from "./components/ui/button"
import { Avatar, AvatarFallback } from "./components/ui/avatar"
import { Badge } from "./components/ui/badge"
import { Zap, List, Users, Bot, Megaphone, Settings2, User, Crown, LogOut, Loader2, Shield, Building2, UserCircle, Plug, MessageCircle, CreditCard } from "lucide-react"
import { Toaster } from "./components/ui/sonner"

type ActiveSection = 'listsB2B' | 'listsB2C' | 'crm' | 'conversations' | 'agents' | 'campaigns' | 'create-campaign' | 'campaign-stats' | 'automations' | 'plans' | 'integrations' | 'account' | 'admin'

function MainApp() {
  const { user, signOut, loading, isAdmin } = useAuth()
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    // Restaurar seção salva no localStorage ao inicializar
    const savedSection = localStorage.getItem('vai_active_section') as ActiveSection | null
    return savedSection || 'crm'
  })
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Handler para logout que aguarda a promise
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      // 🔥 Logout instantâneo - não aguardar resposta do servidor
      await signOut()
      // Redirecionar imediatamente
      window.location.href = '/'
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      // Mesmo com erro, redireciona imediatamente
      window.location.href = '/'
    }
  }

  // Debug: mostrar estado de loading
  useEffect(() => {
    console.log('🔄 MainApp state:', { loading, userExists: !!user, userEmail: user?.email })
  }, [loading, user])

  // 🔥 Fechar SSE quando usuário faz logout
  useEffect(() => {
    if (!user && isLoggingOut) {
      // Enviar mensagem para ConversationsPage fechar SSE
      window.dispatchEvent(new CustomEvent('logout-user'))
    }
  }, [user, isLoggingOut])

  // Salvar seção no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('vai_active_section', activeSection)
  }, [activeSection])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-vai-blue-tech" />
          <p className="text-vai-text-secondary">Carregando VAI...</p>
          <p className="text-xs text-gray-400 mt-2">Verificando sua sessão...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  const menuItems = [
    {
      key: 'listsB2B' as ActiveSection,
      icon: Building2,
      label: 'Listas de Contato',
      description: 'Gerencie seus contatos'
    },
    {
      key: 'crm' as ActiveSection,
      icon: Users,
      label: 'CRM',
      description: 'Gestão de oportunidades'
    },
    {
      key: 'conversations' as ActiveSection,
      icon: MessageCircle,
      label: 'Conversas',
      description: 'Chat multi-canal'
    },
    {
      key: 'agents' as ActiveSection,
      icon: Bot,
      label: 'Agentes',
      description: 'Estilos de abordagem'
    },
    {
      key: 'campaigns' as ActiveSection,
      icon: Megaphone,
      label: 'Campanhas',
      description: 'Disparos em massa'
    },
    {
      key: 'plans' as ActiveSection,
      icon: CreditCard,
      label: 'Planos',
      description: 'Gerencie seus planos'
    },
    {
      key: 'account' as ActiveSection,
      icon: User,
      label: 'Minha Conta',
      description: 'Configurações e preferências'
    },
    {
      key: 'integrations' as ActiveSection,
      icon: Plug,
      label: 'Integrações',
      description: 'Conecte-se a outros sistemas'
    },
    ...(isAdmin ? [{
      key: 'admin' as ActiveSection,
      icon: Crown,
      label: 'Painel Admin',
      description: 'Gerenciar usuários e sistema'
    }] : [])
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'listsB2B':
        return <ListGeneratorB2B />
      case 'listsB2C':
        return <ListGeneratorB2C />
      case 'crm':
        return <CRMPage />
      case 'conversations':
        return <ConversationsPage />
      case 'agents':
        return <Agents />
      case 'campaigns':
        return <CampaignsPage 
          onCreateCampaign={() => setActiveSection('create-campaign')} 
          onEditCampaign={() => setActiveSection('create-campaign')}
          onViewStats={(campaignId) => {
            setSelectedCampaignId(campaignId)
            setActiveSection('campaign-stats')
          }}
        />
      case 'create-campaign':
        return <CreateCampaignPage onBack={() => setActiveSection('campaigns')} />
      case 'campaign-stats':
        return <CampaignStatsPage 
          campaignId={selectedCampaignId!} 
          onBack={() => setActiveSection('campaigns')} 
        />
      case 'automations':
        return <Automations />
      case 'plans':
        return <PlansPage />
      case 'integrations':
        return <Integrations />
      case 'account':
        return <AccountSettings />
      case 'admin':
        return isAdmin ? <AdminPanel /> : <ListGeneratorB2B />
      default:
        return <ListGeneratorB2B />
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar className="w-64 border-r">
          <SidebarHeader className="p-6 border-b">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center justify-center">
                <img 
                  src="https://agencianovofoco.com.br/wp-content/uploads/2025/12/vai-azul.png" 
                  alt="VAI Logo" 
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                Vendedor Automático Inteligente
              </p>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => !item.comingSoon && setActiveSection(item.key)}
                    isActive={activeSection === item.key}
                    disabled={item.comingSoon}
                    className="w-full justify-start h-12"
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {item.comingSoon && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                            EM BREVE
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="p-4 border-t">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate text-sm">
                    {user.name}
                  </p>
                  {isAdmin && <Shield className="w-3 h-3 text-yellow-600" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Admin
                  </Badge>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sm:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <h2 className="font-semibold text-sm sm:text-base truncate">
                  {menuItems.find(item => item.key === activeSection)?.label}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                  {menuItems.find(item => item.key === activeSection)?.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Badge variant="outline" className="hidden lg:flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span className="hidden xl:inline">Administrador</span>
                </Badge>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">
                  Olá, {user.name.split(' ')[0]}!
                </p>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2 sm:hidden"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"
import { useAuth } from "../hooks/useAuthLaravel"
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin,
  Save,
  Key,
  Bell,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react"
import { Switch } from "./ui/switch"

function AccountSettingsContent() {
  const { user, isAdmin } = useAuth()
  
  // User info
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("+55 11 99999-9999")
  const [company, setCompany] = useState("VAI - Vendedor Automático Inteligente")
  const [address, setAddress] = useState("São Paulo, SP")
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [whatsappNotifications, setWhatsappNotifications] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  
  // Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSaveProfile = () => {
    setSuccessMessage("Perfil atualizado com sucesso!")
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Preencha todos os campos de senha")
      return
    }
    
    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não coincidem")
      return
    }
    
    if (newPassword.length < 8) {
      setErrorMessage("A senha deve ter no mínimo 8 caracteres")
      return
    }
    
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSuccessMessage("Senha alterada com sucesso!")
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleSaveNotifications = () => {
    setSuccessMessage("Preferências de notificação atualizadas!")
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <CardTitle>Informações Pessoais</CardTitle>
            </div>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nome da empresa"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Localização</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cidade, Estado"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Administrador do Sistema
                </Badge>
              )}
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite novamente"
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sua senha deve ter no mínimo 8 caracteres e incluir letras e números.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                <Key className="w-4 h-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Configure como você quer receber atualizações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba atualizações sobre suas campanhas e leads por email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsapp-notifications">Notificações por WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsapp-notifications"
                checked={whatsappNotifications}
                onCheckedChange={setWhatsappNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-report">Relatório Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um resumo semanal do desempenho de vendas
                </p>
              </div>
              <Switch
                id="weekly-report"
                checked={weeklyReport}
                onCheckedChange={setWeeklyReport}
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveNotifications}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Preferências
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              <CardTitle>Plano e Assinatura</CardTitle>
            </div>
            <CardDescription>
              Informações sobre seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border" style={{ background: 'linear-gradient(to right, #E8F1FD, #E3F2EC)', borderColor: '#1F5FBF40' }}>
              <div>
                <p className="font-semibold text-lg">Plano Professional</p>
                <p className="text-sm text-muted-foreground">
                  Acesso ilimitado a todas as funcionalidades
                </p>
              </div>
              <Badge className="bg-blue-600">Ativo</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Listas Criadas</p>
                <p className="text-2xl font-semibold">Ilimitadas</p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Agentes Ativos</p>
                <p className="text-2xl font-semibold">Ilimitados</p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Campanhas/Mês</p>
                <p className="text-2xl font-semibold">Ilimitadas</p>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Seu plano renova automaticamente todo dia 15 do mês.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export function AccountSettings() {
  return <AccountSettingsContent />
}
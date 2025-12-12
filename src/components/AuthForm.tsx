import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { useAuth } from "../hooks/useAuthLaravel"
import { AuthDiagnostics } from "./AuthDiagnostics"
import { TroubleshootingGuide } from "./TroubleshootingGuide"
import { Zap, Loader2, AlertCircle, Crown, Mail, Lock, User, Building, ChevronDown, HelpCircle, RefreshCw, Sparkles, TrendingUp, Shield } from "lucide-react"
import { toast } from "sonner@2.0.3"

export function AuthForm() {
  const { signIn, signUp, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!formData.email || !formData.password) {
      setErrors({ general: 'Email e senha são obrigatórios' })
      return
    }
    
    const result = await signIn(formData.email, formData.password)
    if (!result.success) {
      setErrors({ general: result.error || 'Erro no login' })
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!formData.email || !formData.password || !formData.name) {
      setErrors({ general: 'Email, senha e nome são obrigatórios' })
      return
    }

    if (formData.password.length < 6) {
      setErrors({ password: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }

    const result = await signUp(formData.email, formData.password, formData.name, formData.company)
    if (!result.success) {
      setErrors({ general: result.error || 'Erro no cadastro' })
    }
  }

  const fillAdminCredentials = () => {
    setFormData({
      email: 'admin@vai.com.br',
      password: 'Admin@VAI2025',
      name: '',
      company: ''
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border border-vai-divider">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-vai-blue-tech to-vai-blue-hover rounded-2xl shadow-md">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-vai-blue-tech to-vai-blue-hover bg-clip-text text-transparent">
              VAI
            </CardTitle>
            <CardDescription>
              Vendedor Automático Inteligente
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="font-medium">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="font-medium">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Senha
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  {errors.general && (
                    <div className="space-y-2">
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.general}
                      </div>
                      {(errors.general.includes('conexão') || errors.general.includes('fetch')) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              <HelpCircle className="w-3 h-3 mr-2" />
                              Como Resolver?
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Guia de Solução de Problemas</DialogTitle>
                              <DialogDescription>
                                Soluções para problemas comuns de conexão
                              </DialogDescription>
                            </DialogHeader>
                            <TroubleshootingGuide error={errors.general} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>

                <div className="pt-4 border-t space-y-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={fillAdminCredentials}
                    disabled={loading}
                    className="w-full h-9 text-sm gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Preencher Credenciais Admin
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-company" className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Empresa (Opcional)
                    </Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="Nome da sua empresa"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Senha
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                    {errors.password && (
                      <div className="text-sm text-destructive">{errors.password}</div>
                    )}
                  </div>

                  {errors.general && (
                    <div className="space-y-2">
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.general}
                      </div>
                      {(errors.general.includes('conexão') || errors.general.includes('fetch')) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              <HelpCircle className="w-3 h-3 mr-2" />
                              Como Resolver?
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Guia de Solução de Problemas</DialogTitle>
                              <DialogDescription>
                                Soluções para problemas comuns de conexão
                              </DialogDescription>
                            </DialogHeader>
                            <TroubleshootingGuide error={errors.general} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-3">
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">
                    Credenciais Administrativas
                  </p>
                </div>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>📧 admin@vai.com.br</p>
                  <p>🔒 Admin@VAI2025</p>
                </div>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs flex items-center justify-between"
                  >
                    <span>Diagnóstico de Conexão</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <AuthDiagnostics />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
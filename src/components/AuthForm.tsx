import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { useAuth } from "../hooks/useAuthLaravel"
import { TroubleshootingGuide } from "./TroubleshootingGuide"
import { Zap, Loader2, AlertCircle, Mail, Lock, User, Building, HelpCircle } from "lucide-react"
import { toast } from "sonner"

export function AuthForm() {
  const { signIn, signUp, loading, loginState } = useAuth()
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
    } else {
      // ✅ Cadastro realizado com sucesso
      // Mostrar mensagem e redirecionar para login
      toast.success('✅ Cadastro realizado! Por favor, faça login.')
      
      // Limpar formulário
      setFormData({
        email: formData.email, // Manter email para facilitar login
        password: '',
        name: '',
        company: ''
      })
      
      // Redirecionar para login após 1 segundo
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border border-vai-divider">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="https://agencianovofoco.com.br/wp-content/uploads/2025/12/vai-azul.png" 
                alt="VAI Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
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
                      disabled={loading || loginState.loading}
                      autoComplete="email"
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
                      disabled={loading || loginState.loading}
                      autoComplete="current-password"
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
                  
                  <Button type="submit" className="w-full h-11" disabled={loading || loginState.loading}>
                    {loading || loginState.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {loginState.status ?? (loginState.loading ? 'Conectando...' : 'Entrando...')}
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  {loginState.error && (
                    <div className="text-xs text-amber-600 text-center">
                      {loginState.error}
                    </div>
                  )}
                </form>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

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

// 🎭 Funções de formatação de máscaras
const formatCPF = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  // Limita a 11 dígitos
  const limited = digits.slice(0, 11)
  // Formata como XXX.XXX.XXX-XX
  if (limited.length <= 3) return limited
  if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`
  if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`
  return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`
}

const formatWhatsApp = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  // Limita a 11 dígitos
  const limited = digits.slice(0, 11)
  // Formata como (XX) XXXXX-XXXX ou (XX) XXXX-XXX
  if (limited.length <= 2) return limited
  if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
}

const formatDateOfBirth = (value: string): string => {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  // Limita a 8 dígitos
  const limited = digits.slice(0, 8)
  // Formata como DD/MM/YYYY
  if (limited.length <= 2) return limited
  if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`
  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`
}

export function AuthForm() {
  const { signIn, signUp, loading, loginState } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    last_name: '',
    cpf: '',
    date_of_birth: '',
    whatsapp: '',
    company: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value
    
    // Aplicar formatação conforme o campo
    if (field === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (field === 'whatsapp') {
      formattedValue = formatWhatsApp(value)
    } else if (field === 'date_of_birth') {
      formattedValue = formatDateOfBirth(value)
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }))
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

    if (!formData.email || !formData.password || !formData.name || !formData.last_name || !formData.cpf || !formData.date_of_birth || !formData.whatsapp) {
      setErrors({ general: 'Todos os campos obrigatórios devem ser preenchidos' })
      return
    }

    if (formData.password.length < 6) {
      setErrors({ password: 'A senha deve ter pelo menos 6 caracteres' })
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      setErrors({ passwordConfirm: 'As senhas não correspondem' })
      return
    }

    const result = await signUp(formData.email, formData.password, formData.name, formData.company, {
      last_name: formData.last_name,
      cpf: formData.cpf,
      date_of_birth: formData.date_of_birth,
      whatsapp: formData.whatsapp
    })
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
        passwordConfirm: '',
        name: '',
        last_name: '',
        cpf: '',
        date_of_birth: '',
        whatsapp: '',
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4" />
                        Nome
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={loading}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-last-name" className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4" />
                        Sobrenome
                      </Label>
                      <Input
                        id="signup-last-name"
                        type="text"
                        placeholder="Seu sobrenome"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        disabled={loading}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-cpf" className="text-sm">
                      CPF (XXX.XXX.XXX-XX)
                    </Label>
                    <Input
                      id="signup-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      disabled={loading}
                      className="h-10 text-sm"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-dob" className="text-sm">
                      Data de Nascimento (DD/MM/AAAA)
                    </Label>
                    <Input
                      id="signup-dob"
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      disabled={loading}
                      className="h-10 text-sm"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2 text-sm">
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
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-whatsapp" className="text-sm">
                      WhatsApp ((XX) XXXXX-XXXX)
                    </Label>
                    <Input
                      id="signup-whatsapp"
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                      disabled={loading}
                      className="h-10 text-sm"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-company" className="flex items-center gap-2 text-sm">
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
                      className="h-10 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2 text-sm">
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
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm" className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4" />
                      Confirmar Senha
                    </Label>
                    <Input
                      id="signup-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={formData.passwordConfirm}
                      onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                      disabled={loading}
                      className="h-10 text-sm"
                    />
                    {errors.passwordConfirm && (
                      <div className="text-sm text-destructive">{errors.passwordConfirm}</div>
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
                  
                  <Button type="submit" className="w-full h-10 text-sm" disabled={loading}>
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

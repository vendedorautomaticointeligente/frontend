import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  RefreshCw,
  ExternalLink
} from "lucide-react"

interface TroubleshootingGuideProps {
  error?: string
}

export function TroubleshootingGuide({ error }: TroubleshootingGuideProps) {
  const commonIssues = [
    {
      title: "Erro de Conexão / Failed to Fetch",
      icon: AlertTriangle,
      color: "text-red-600",
      solutions: [
        "Verifique sua conexão com a internet",
        "Tente recarregar a página (F5 ou Ctrl+R)",
        "Limpe o cache do navegador",
        "Aguarde alguns segundos e tente novamente",
        "Verifique se há firewall ou bloqueador de anúncios ativo"
      ]
    },
    {
      title: "Edge Function Não Encontrada (404)",
      icon: HelpCircle,
      color: "text-yellow-600",
      solutions: [
        "A Edge Function pode não estar implantada",
        "Aguarde alguns minutos para cold start",
        "Verifique o status do Supabase",
        "Entre em contato com o administrador do sistema"
      ]
    },
    {
      title: "Erro de Autenticação (401)",
      icon: AlertTriangle,
      color: "text-orange-600",
      solutions: [
        "Faça logout e login novamente",
        "Limpe os cookies e cache do navegador",
        "Verifique se as credenciais estão corretas",
        "Aguarde alguns minutos se houve muitas tentativas"
      ]
    }
  ]

  const quickFixes = [
    "🔄 Recarregue a página",
    "🌐 Verifique a conexão com internet",
    "🔑 Faça logout e login novamente",
    "🧹 Limpe cache e cookies",
    "⏰ Aguarde alguns minutos"
  ]

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro Detectado</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Soluções Rápidas
          </CardTitle>
          <CardDescription>
            Tente estas soluções primeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickFixes.map((fix, index) => (
              <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{fix}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {commonIssues.map((issue, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <issue.icon className={`w-4 h-4 ${issue.color}`} />
                {issue.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {issue.solutions.map((solution, sIndex) => (
                  <li key={sIndex} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <HelpCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Ainda com Problemas?</AlertTitle>
        <AlertDescription className="text-blue-700 space-y-2">
          <p>
            Se os problemas persistirem, verifique:
          </p>
          <ul className="text-sm space-y-1 mt-2">
            <li>• Status do servidor backend</li>
            <li>• Configurações de rede e firewall</li>
            <li>• Console do navegador (F12) para erros detalhados</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}

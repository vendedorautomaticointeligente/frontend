#!/bin/bash

echo "🚀 Deploy das correções CORS para produção"
echo "========================================="

# Função para conectar via SSH e executar comandos
deploy_backend() {
    echo "📡 Fazendo deploy do backend..."
    
    # Substitua pelos dados do seu servidor
    SERVER_USER="seu_usuario"
    SERVER_IP="seu_ip_do_servidor" 
    BACKEND_PATH="/caminho/para/backend"
    
    echo "⚠️  CONFIGURE AS VARIÁVEIS DO SERVIDOR:"
    echo "   SERVER_USER: usuário SSH do servidor"
    echo "   SERVER_IP: IP do servidor"
    echo "   BACKEND_PATH: caminho do backend no servidor"
    echo ""
    
    echo "📋 Comandos para executar NO SERVIDOR:"
    echo "---------------------------------------"
    
    echo "# 1. Atualizar backend"
    echo "cd $BACKEND_PATH"
    echo "git pull origin main"
    echo ""
    
    echo "# 2. Recriar containers"
    echo "docker-compose down"
    echo "docker-compose up --build -d"
    echo ""
    
    echo "# 3. Verificar status"
    echo "docker-compose ps"
    echo "docker-compose logs backend --tail=50"
    echo ""
    
    echo "# 4. Testar CORS"
    echo "curl -I -H \"Origin: https://app.vendedorautomaticointeligente.com\" \\"
    echo "     -H \"Access-Control-Request-Method: POST\" \\"
    echo "     -X OPTIONS \\"
    echo "     https://api.vendedorautomaticointeligente.com/api/auth/login"
}

deploy_frontend() {
    echo ""
    echo "📡 Fazendo deploy do frontend..."
    
    SERVER_USER="seu_usuario"
    SERVER_IP="seu_ip_do_servidor"
    FRONTEND_PATH="/caminho/para/frontend"
    
    echo "📋 Comandos para executar NO SERVIDOR:"
    echo "---------------------------------------"
    
    echo "# 1. Atualizar frontend"
    echo "cd $FRONTEND_PATH"
    echo "git pull origin main"
    echo ""
    
    echo "# 2. Se usar Docker:"
    echo "docker-compose down"
    echo "docker-compose up --build -d"
    echo ""
    
    echo "# 3. Se usar nginx direto:"
    echo "# Copiar arquivos de build para nginx"
    echo "sudo cp -r build/* /var/www/html/"
    echo "sudo systemctl reload nginx"
}

echo "🔧 Mudanças aplicadas localmente:"
echo "✅ Backend: Middleware CORS + configuração"
echo "✅ Frontend: URLs corretas (api.vendedorautomaticointeligente.com)"
echo "✅ Nginx: Headers CORS configurados"
echo ""

deploy_backend
deploy_frontend

echo ""
echo "🎯 Próximos passos:"
echo "1. Conecte no servidor via SSH"
echo "2. Execute os comandos listados acima"
echo "3. Teste o login novamente"
echo ""
echo "🧪 Para testar CORS após deploy:"
echo "curl -I -H \"Origin: https://app.vendedorautomaticointeligente.com\" \\"
echo "     -H \"Access-Control-Request-Method: POST\" \\"
echo "     -X OPTIONS \\"
echo "     https://api.vendedorautomaticointeligente.com/api/auth/login"
echo ""
echo "✅ Se aparecer 'Access-Control-Allow-Origin' no resultado = CORS OK!"
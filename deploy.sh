#!/bin/sh
# Script de deploy - VPS Frontend
# Executa após: git pull (fazer via EasyPanel)

echo "📦 Atualizando URLs do frontend..."
find build/assets -name "*.js" -type f -exec sed -i 's|http://localhost:8000/api|https://api.vendedorautomaticointeligente.com/api|g' {} \;

echo "✅ Frontend atualizado!"

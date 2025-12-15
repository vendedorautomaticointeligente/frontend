#!/bin/bash
# Script de deploy - VPS Frontend
# Executa após: git pull

echo "📦 Atualizando URLs do frontend..."
find build/assets -name "*.js" -type f -exec sed -i 's|http://localhost:8002/api|https://api.vendedorautomaticointeligente.com/api|g' {} \;

echo "✅ Frontend atualizado!"

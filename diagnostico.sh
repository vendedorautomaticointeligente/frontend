#!/bin/bash

# Script de diagnóstico para erro 404 do frontend
echo "======================================"
echo "DIAGNÓSTICO - ERRO 404 FRONTEND"
echo "======================================"
echo ""

echo "1️⃣ VERIFICANDO SE O CONTAINER ESTÁ RODANDO:"
docker ps | grep vai-frontend
echo ""

echo "2️⃣ VERIFICANDO LOGS DO CONTAINER:"
docker logs vai-frontend | tail -20
echo ""

echo "3️⃣ TESTANDO CONECTIVIDADE LOCAL:"
docker exec vai-frontend wget -q -O- http://localhost:80 | head -50
echo ""

echo "4️⃣ VERIFICANDO ARQUIVOS NO CONTAINER:"
docker exec vai-frontend ls -la /usr/share/nginx/html/ | head -20
echo ""

echo "5️⃣ VERIFICANDO SE ARQUIVO INDEX.HTML EXISTE:"
docker exec vai-frontend test -f /usr/share/nginx/html/index.html && echo "✅ index.html existe" || echo "❌ index.html NÃO ENCONTRADO"
echo ""

echo "6️⃣ TESTANDO NGINX CONFIG:"
docker exec vai-frontend nginx -t
echo ""

echo "7️⃣ VERIFICANDO TAMANHO DA PASTA BUILD:"
docker exec vai-frontend du -sh /usr/share/nginx/html/
echo ""

echo "======================================"
echo "FIM DO DIAGNÓSTICO"
echo "======================================"

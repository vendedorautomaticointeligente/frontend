// Script para debug rápido no console do navegador
// Cole isso no console do DevTools (F12) enquanto estiver em "Minha Conta"

// Verificar se a chave está no localStorage
const token = localStorage.getItem('laravel_auth_token');
console.log('🔑 Token no localStorage:', token ? `✅ presente (${token.length} chars)` : '❌ faltando');

if (token) {
    console.log('📍 Primeiros 30 chars:', token.substring(0, 30) + '...');
    console.log('📍 Formato correto?', token.includes('|') ? '✅ sim (contém |)' : '⚠️ pode estar errado');
}

// Tentar fazer a requisição manualmente
const baseUrl = 'http://localhost:8000';
const authToken = token;

if (authToken) {
    fetch(`${baseUrl}/api/auth/me`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        console.log('📊 Response status:', r.status);
        return r.json();
    })
    .then(data => {
        console.log('✅ Sucesso! Dados:', data);
        if (data.plan) {
            console.log('📋 Plano encontrado:', data.plan.current_plan);
            console.log('Limites:', data.plan.limits);
        }
    })
    .catch(err => console.error('❌ Erro:', err));
} else {
    console.log('❌ Token não encontrado no localStorage!');
}

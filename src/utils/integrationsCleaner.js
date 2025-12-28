/**
 * Limpador de Cache de Integrações do Frontend
 * Executar no console do navegador (F12 > Console)
 */

// Funções auxiliares
const IntegrationsCleaner = {
  // Chaves de cache de integrações
  CACHE_KEYS: [
    'integrations_cache',
    'integrations_cache_meta',
    'integrations_whatsapp_connections'
  ],

  // Listar todos os itens em localStorage
  listAll: function() {
    console.log('📋 Itens no localStorage relacionados a integrações:');
    console.log('═════════════════════════════════════════════');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes('integration') || key.includes('connection') || key.includes('whatsapp')) {
        const value = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(value);
          console.log(`\n🔑 ${key}:`);
          console.log(parsed);
        } catch (e) {
          console.log(`\n🔑 ${key}: ${value}`);
        }
      }
    }
  },

  // Limpar cache específico
  clearKey: function(key) {
    const exists = localStorage.getItem(key);
    if (exists) {
      localStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
      return true;
    } else {
      console.log(`⚠️  Chave não encontrada: ${key}`);
      return false;
    }
  },

  // Limpar todos os caches de integração
  clearAllIntegrations: function() {
    console.log('🗑️  Limpando cache de integrações...');
    console.log('═════════════════════════════════════════════');
    
    let cleared = 0;
    
    // Limpar chaves conhecidas
    this.CACHE_KEYS.forEach(key => {
      if (this.clearKey(key)) {
        cleared++;
      }
    });
    
    // Limpar chaves dinâmicas
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('integration') || 
        key.includes('connection') || 
        key.includes('whatsapp')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      if (!this.CACHE_KEYS.includes(key)) {
        this.clearKey(key);
        cleared++;
      }
    });
    
    console.log(`\n✅ Total limpo: ${cleared} chave(s)`);
    console.log('\n⚠️  Recarregando página em 2 segundos...');
    setTimeout(() => {
      location.reload();
    }, 2000);
  },

  // Filtrar instâncias específicas
  removeConnection: function(connectionId) {
    const data = JSON.parse(localStorage.getItem('integrations_whatsapp_connections') || '[]');
    const filtered = data.filter(conn => conn.id !== connectionId);
    
    if (data.length !== filtered.length) {
      localStorage.setItem('integrations_whatsapp_connections', JSON.stringify(filtered));
      console.log(`✅ Conexão ${connectionId} removida do cache`);
      console.log('\n⚠️  Recarregando página em 2 segundos...');
      setTimeout(() => {
        location.reload();
      }, 2000);
      return true;
    } else {
      console.log(`❌ Conexão ${connectionId} não encontrada`);
      return false;
    }
  },

  // Mostrar resumo
  summary: function() {
    console.clear();
    console.log('╔═════════════════════════════════════════╗');
    console.log('║  LIMPADOR DE CACHE DE INTEGRAÇÕES      ║');
    console.log('╚═════════════════════════════════════════╝');
    console.log('');
    console.log('Comandos disponíveis:');
    console.log('');
    console.log('1. Listar todos os caches:');
    console.log('   IntegrationsCleaner.listAll()');
    console.log('');
    console.log('2. Remover cache específico:');
    console.log('   IntegrationsCleaner.clearKey("integrations_cache")');
    console.log('');
    console.log('3. Limpar TODOS os caches (e recarregar):');
    console.log('   IntegrationsCleaner.clearAllIntegrations()');
    console.log('');
    console.log('4. Remover conexão específica:');
    console.log('   IntegrationsCleaner.removeConnection("connection_id")');
    console.log('');
  }
};

// Mostrar resumo ao carregar
IntegrationsCleaner.summary();

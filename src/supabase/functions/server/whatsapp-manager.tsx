/**
 * WhatsApp Manager - Gerencia conexões reais com WhatsApp usando Baileys
 * Biblioteca: @whiskeysockets/baileys
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeInMemoryStore,
  Browsers
} from 'npm:@whiskeysockets/baileys@6.7.8'
import { Boom } from 'npm:@hapi/boom@10.0.1'
import pino from 'npm:pino@9.5.0'

// Armazena as sessões ativas em memória
const activeSessions = new Map()
const qrCodeCallbacks = new Map()

/**
 * Cria uma nova sessão WhatsApp e gera QR Code
 */
export async function createWhatsAppSession(sessionId: string, onQRCode: (qr: string) => void, onConnected: () => void) {
  console.log(`📱 Creating WhatsApp session: ${sessionId}`)
  
  try {
    // Configuração de autenticação in-memory (em produção, salvar no Supabase)
    const authState = await useMultiFileAuthState(`/tmp/baileys_auth_${sessionId}`)
    
    // Logger
    const logger = pino({ level: 'silent' }) // 'debug' para logs detalhados
    
    // Cria o socket WhatsApp
    const sock = makeWASocket({
      logger,
      printQRInTerminal: false,
      auth: authState.state,
      browser: Browsers.ubuntu('VAI'),
      defaultQueryTimeoutMs: undefined,
    })
    
    // Armazena a sessão
    activeSessions.set(sessionId, {
      socket: sock,
      state: authState,
      connected: false
    })
    
    // Listener para atualização de credenciais
    sock.ev.on('creds.update', authState.saveCreds)
    
    // Listener para atualizações de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update
      
      // Quando recebe QR Code
      if (qr) {
        console.log(`🔲 QR Code gerado para sessão ${sessionId}`)
        onQRCode(qr)
        
        // Chama callback se existir
        const callback = qrCodeCallbacks.get(sessionId)
        if (callback) {
          callback(qr)
        }
      }
      
      // Quando conecta
      if (connection === 'open') {
        console.log(`✅ WhatsApp conectado: ${sessionId}`)
        const session = activeSessions.get(sessionId)
        if (session) {
          session.connected = true
          activeSessions.set(sessionId, session)
        }
        onConnected()
      }
      
      // Quando desconecta
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log(`❌ Conexão fechada. Reconectar: ${shouldReconnect}`)
        
        if (shouldReconnect) {
          // Reconecta automaticamente
          setTimeout(() => {
            createWhatsAppSession(sessionId, onQRCode, onConnected)
          }, 3000)
        } else {
          // Remove a sessão
          activeSessions.delete(sessionId)
        }
      }
    })
    
    // Listener para mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          console.log(`📨 Mensagem recebida na sessão ${sessionId}:`, msg)
          // Aqui você pode processar a mensagem e salvar no banco
        }
      }
    })
    
    return { success: true, sessionId }
    
  } catch (error) {
    console.error(`❌ Erro ao criar sessão WhatsApp:`, error)
    throw error
  }
}

/**
 * Verifica se uma sessão está conectada
 */
export function isSessionConnected(sessionId: string): boolean {
  const session = activeSessions.get(sessionId)
  return session?.connected === true
}

/**
 * Obtém informações da sessão
 */
export function getSessionInfo(sessionId: string) {
  const session = activeSessions.get(sessionId)
  if (!session) {
    return null
  }
  
  return {
    connected: session.connected,
    user: session.socket?.user,
    sessionId
  }
}

/**
 * Envia uma mensagem pelo WhatsApp
 */
export async function sendWhatsAppMessage(sessionId: string, to: string, message: string) {
  const session = activeSessions.get(sessionId)
  
  if (!session || !session.connected) {
    throw new Error('Sessão não conectada')
  }
  
  try {
    // Formata o número no padrão do WhatsApp
    const jid = to.includes('@s.whatsapp.net') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
    
    await session.socket.sendMessage(jid, { text: message })
    
    console.log(`✅ Mensagem enviada para ${to}`)
    return { success: true }
    
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem:`, error)
    throw error
  }
}

/**
 * Desconecta uma sessão
 */
export async function disconnectSession(sessionId: string) {
  const session = activeSessions.get(sessionId)
  
  if (session) {
    await session.socket.logout()
    activeSessions.delete(sessionId)
    console.log(`🔌 Sessão ${sessionId} desconectada`)
  }
}

/**
 * Registra callback para QR Code
 */
export function onQRCodeGenerated(sessionId: string, callback: (qr: string) => void) {
  qrCodeCallbacks.set(sessionId, callback)
}

/**
 * Remove callback de QR Code
 */
export function removeQRCodeCallback(sessionId: string) {
  qrCodeCallbacks.delete(sessionId)
}

import { FC } from "react"

/**
 * PASSO 5: TypingIndicator Component
 * 
 * Mostra animação de digitação quando agente está respondendo
 * com múltiplos segmentos
 */

interface TypingIndicatorProps {
  isTyping: boolean
  agentName?: string
}

export const TypingIndicator: FC<TypingIndicatorProps> = ({ 
  isTyping, 
  agentName = "Agente" 
}) => {
  if (!isTyping) {
    return null
  }

  return (
    <div className="flex items-end gap-2">
      {/* Avatar simulado */}
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">A</span>
      </div>

      {/* Dots animados */}
      <div className="flex items-end gap-1 bg-gray-200 text-gray-600 px-3 py-2 rounded-lg rounded-bl-none">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
        
        {/* Texto opcional */}
        <span className="text-xs ml-1 text-gray-600">Digitando...</span>
      </div>
    </div>
  )
}

export default TypingIndicator

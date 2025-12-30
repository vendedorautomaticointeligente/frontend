import React from 'react'
import { X, AlertCircle, ArrowRight } from 'lucide-react'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  plan?: string
  currentCount?: number
  maxLimit?: number
  limitName?: string
  onUpgradeClick?: () => void
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = 'Limite do Plano Atingido',
  message,
  plan,
  currentCount,
  maxLimit,
  limitName,
  onUpgradeClick
}) => {
  if (!isOpen) return null

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick()
    }
    onClose()
  }

  const getLimitDescription = (name?: string) => {
    switch (name) {
      case 'max_campaigns_per_month':
        return 'listas/campanhas por mês'
      case 'max_ai_agents':
        return 'agentes IA'
      case 'max_automations':
        return 'automações'
      case 'max_connected_numbers':
        return 'números conectados'
      case 'max_contacts_per_month':
        return 'contatos por mês'
      default:
        return 'recursos'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-white flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Message */}
          <p className="text-gray-700">{message}</p>

          {/* Usage Stats */}
          {currentCount !== undefined && maxLimit !== undefined && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {getLimitDescription(limitName)}
                </span>
                <span className="text-sm font-bold text-red-600">
                  {currentCount} de {maxLimit}
                </span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((currentCount / maxLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Plan Info */}
          {plan && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Seu plano atual</p>
              <p className="font-bold text-blue-900 uppercase tracking-wide">{plan}</p>
            </div>
          )}

          {/* Message about upgrade */}
          <p className="text-sm text-gray-600 italic">
            Faça upgrade do seu plano para ter acesso a mais recursos e aumentar seus limites.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Fechar
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            Ver Planos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

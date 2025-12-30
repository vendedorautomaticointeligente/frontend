import { useState, useCallback } from 'react'
import { getToken } from '../utils/tokenManager'

interface CheckLimitResult {
  canPerform: boolean
  remaining: number
  plan: string
  message?: string
  currentCount?: number
}

export function useCheckLimit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkLimit = useCallback(async (
    action: string,
    currentCount?: number
  ): Promise<CheckLimitResult> => {
    setLoading(true)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        throw new Error('Não autenticado')
      }

      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '')
      const response = await fetch(
        `${baseUrl}/api/payments/check-limit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action,
            current_count: currentCount
          })
        }
      )

      const data = await response.json()

      if (!data.success) {
        setError(data.message || 'Limite atingido')
        return {
          canPerform: false,
          remaining: data.remaining || 0,
          plan: data.plan || 'trial',
          message: data.message,
          currentCount: currentCount || 0
        }
      }

      return {
        canPerform: true,
        remaining: data.remaining || 0,
        plan: data.plan || 'trial',
        currentCount: currentCount || 0
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao verificar limite'
      setError(message)
      return {
        canPerform: false,
        remaining: 0,
        plan: 'trial',
        message,
        currentCount: currentCount || 0
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const checkCanCreateCampaign = useCallback(async (currentCount: number) => {
    return checkLimit('create_campaign', currentCount)
  }, [checkLimit])

  const checkCanCreateAgent = useCallback(async (currentCount: number) => {
    return checkLimit('create_agent', currentCount)
  }, [checkLimit])

  const checkCanCreateAutomation = useCallback(async (currentCount: number) => {
    return checkLimit('create_automation', currentCount)
  }, [checkLimit])

  const checkCanAddWhatsApp = useCallback(async (currentCount: number) => {
    return checkLimit('add_whatsapp_number', currentCount)
  }, [checkLimit])

  const checkCanAddContact = useCallback(async (currentCount: number) => {
    return checkLimit('add_contact', currentCount)
  }, [checkLimit])

  return {
    checkLimit,
    checkCanCreateCampaign,
    checkCanCreateAgent,
    checkCanCreateAutomation,
    checkCanAddWhatsApp,
    checkCanAddContact,
    loading,
    error,
    setError
  }
}

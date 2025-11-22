import { useState, useEffect } from 'react'
import { paymentMethodService, type PaymentMethod } from '../services/paymentMethodService'

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await paymentMethodService.getAllPaymentMethods()
        setPaymentMethods(data)
      } catch (e) {
        console.error('Failed to load payment methods', e)
        setError(e as Error)
        setPaymentMethods([])
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentMethods()
  }, [])

  const refreshPaymentMethods = async () => {
    try {
      const data = await paymentMethodService.getAllPaymentMethods()
      setPaymentMethods(data)
      setError(null)
    } catch (e) {
      console.error('Failed to refresh payment methods', e)
      setError(e as Error)
    }
  }

  return { paymentMethods, loading, error, refreshPaymentMethods }
}


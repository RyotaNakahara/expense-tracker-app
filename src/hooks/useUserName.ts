import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { User } from 'firebase/auth'

export const useUserName = (user: User | null) => {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.uid) {
        setDisplayName(null)
        setLoading(false)
        return
      }

      try {
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)
        
        if (!snap.exists()) {
          console.warn('[useUserName] users document not found for uid:', user.uid)
          setDisplayName(user.displayName ?? null)
        } else {
          const data = snap.data() as { name?: string } | undefined
          const name = (data?.name ?? '').trim()
          setDisplayName(name !== '' ? name : user.displayName ?? null)
        }
      } catch (e) {
        console.error('Failed to load user profile', e)
        setDisplayName(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  return { displayName, loading }
}


import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../services/auth'

export function useRole() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return () => {}
    }

    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.data() : null)
        setLoading(false)
      },
      () => {
        setProfile(null)
        setLoading(false)
      },
    )

    return () => {
      unsub()
    }
  }, [user])

  const role = profile?.role ?? null

  return {
    role,
    profile,
    loading,
    isAdmin: role === 'admin',
    isCleaner: role === 'cleaner',
  }
}

export default useRole

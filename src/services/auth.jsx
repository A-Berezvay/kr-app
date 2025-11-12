import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'

const AuthContext = createContext()

export function AuthProvider({ children }){
  const authValue = useProvideAuth()
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

function useProvideAuth(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      setUser(u)
      setLoading(false)
    })
    return unsub
  },[])

  const signOut = async () => {
    await fbSignOut(auth)
  }

  return { user, loading, signOut }
}

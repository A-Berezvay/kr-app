import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'

const AuthContext = createContext()

export function AuthProvider({ children }){
  const authValue = useProvideAuth()
  // Use createElement to avoid JSX in a .js file
  return React.createElement(AuthContext.Provider, { value: authValue }, children)
}

export const useAuth = () => useContext(AuthContext)

function useProvideAuth(){
  const [user, setUser] = useState(null)
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      setUser(u)
    })
    return unsub
  },[])

  const signOut = async () => {
    await fbSignOut(auth)
  }

  return { user, signOut }
}

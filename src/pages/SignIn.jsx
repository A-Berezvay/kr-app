import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function SignIn(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{padding: 16}}>
      <h2>Sign in</h2>
      <form onSubmit={submit} style={{display:'grid', gap:8, width: 320}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
        <button type="submit">Sign in</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </form>
    </div>
  )
}

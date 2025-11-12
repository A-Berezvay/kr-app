import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../services/auth'

export default function SignIn(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/clients" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/clients', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue to the admin dashboard.</p>
        <form onSubmit={submit} className="form-grid">
          <label className="form-field">
            <span>Email</span>
            <input
              className="input"
              placeholder="name@example.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              className="input"
              placeholder="Enter your password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">Sign in</button>
          {error && <div className="form-error" role="alert">{error}</div>}
        </form>
      </div>
    </div>
  )
}

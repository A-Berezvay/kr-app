import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import SignIn from './pages/SignIn'
import Clients from './pages/Clients'
import Jobs from './pages/Jobs'
import Users from './pages/Users'
import { AuthProvider, useAuth } from './services/auth'

function Nav() {
  const { user, signOut } = useAuth()
  return (
    <nav style={{display: 'flex', gap: 12, padding: 12}}>
      <Link to="/clients">Clients</Link>
      <Link to="/jobs">Jobs</Link>
      <Link to="/users">Users</Link>
      {user ? (
        <button onClick={signOut}>Sign out</button>
      ) : (
        <Link to="/signin">Sign in</Link>
      )}
    </nav>
  )
}

export default function App(){
  return (
    <AuthProvider>
      <Nav />
      <Routes>
        <Route path="/signin" element={<SignIn/>} />
        <Route path="/clients" element={<Clients/>} />
        <Route path="/jobs" element={<Jobs/>} />
        <Route path="/users" element={<Users/>} />
        <Route path="/" element={<Clients/>} />
      </Routes>
    </AuthProvider>
  )
}

import React from 'react'
import { Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom'
import SignIn from './pages/SignIn'
import Clients from './pages/Clients'
import Jobs from './pages/Jobs'
import Users from './pages/Users'
import { AuthProvider, useAuth } from './services/auth'

function PrivateRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <span className="loading-spinner" aria-hidden />
          <p>Checking authentication…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <Outlet />
}

function ProtectedLayout() {
  const { signOut, user } = useAuth()

  const navClassName = ({ isActive }) =>
    ['nav-link', isActive ? 'nav-link-active' : ''].filter(Boolean).join(' ')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>KR Admin</h1>
          {user?.email && <p>{user.email}</p>}
        </div>
        <nav className="nav-links">
          <NavLink to="/clients" className={navClassName}>
            Clients
          </NavLink>
          <NavLink to="/jobs" className={navClassName}>
            Jobs
          </NavLink>
          <NavLink to="/users" className={navClassName}>
            Users
          </NavLink>
        </nav>
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

export default function App(){
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn/>} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="clients" replace />} />
            <Route path="clients" element={<Clients/>} />
            <Route path="jobs" element={<Jobs/>} />
            <Route path="users" element={<Users/>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/clients" replace />} />
      </Routes>
    </AuthProvider>
  )
}

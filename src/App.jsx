import React from 'react'
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
  useOutletContext,
} from 'react-router-dom'
import SignIn from './pages/SignIn'
import Clients from './pages/Clients'
import Jobs from './pages/Jobs'
import Users from './pages/Users'
import MyJobs from './pages/MyJobs'
import { AuthProvider, useAuth } from './services/auth'
import useRole from './hooks/useRole'

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <span className="loading-spinner" aria-hidden />
        <p>{message}</p>
      </div>
    </div>
  )
}

function PrivateRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Checking authentication…" />
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  return <Outlet />
}

function ProtectedLayout() {
  const { signOut, user } = useAuth()
  const roleState = useRole()

  if (roleState.loading) {
    return <LoadingScreen message="Loading profile…" />
  }

  const navClassName = ({ isActive }) =>
    ['nav-link', isActive ? 'nav-link-active' : ''].filter(Boolean).join(' ')

  const displayName = roleState.profile?.displayName || user?.email || 'Account'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>KR Admin</h1>
          <p>{displayName}</p>
        </div>
        <nav className="nav-links">
          {roleState.isAdmin && (
            <>
              <NavLink to="/jobs" className={navClassName}>
                Jobs
              </NavLink>
              <NavLink to="/clients" className={navClassName}>
                Clients
              </NavLink>
              <NavLink to="/users" className={navClassName}>
                Users
              </NavLink>
            </>
          )}
          {roleState.isCleaner && (
            <NavLink to="/my-jobs" className={navClassName}>
              My Jobs
            </NavLink>
          )}
        </nav>
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main className="app-content">
        <Outlet context={roleState} />
      </main>
    </div>
  )
}

function useRoleContext() {
  return useOutletContext()
}

function AdminRoute() {
  const role = useRoleContext()
  if (role.loading) {
    return <LoadingScreen message="Loading profile…" />
  }
  if (!role.isAdmin) {
    if (role.isCleaner) {
      return <Navigate to="/my-jobs" replace />
    }
    return <Navigate to="/signin" replace />
  }
  return <Outlet />
}

function CleanerRoute() {
  const role = useRoleContext()
  if (role.loading) {
    return <LoadingScreen message="Loading profile…" />
  }
  if (!role.isCleaner) {
    if (role.isAdmin) {
      return <Navigate to="/jobs" replace />
    }
    return <Navigate to="/signin" replace />
  }
  return <Outlet />
}

function RoleRedirect() {
  const role = useRoleContext()
  if (role.loading) {
    return <LoadingScreen message="Loading profile…" />
  }
  if (role.isCleaner) {
    return <Navigate to="my-jobs" replace />
  }
  if (role.isAdmin) {
    return <Navigate to="jobs" replace />
  }
  return <Navigate to="clients" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<RoleRedirect />} />
            <Route element={<AdminRoute />}>
              <Route path="clients" element={<Clients />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="users" element={<Users />} />
            </Route>
            <Route element={<CleanerRoute />}>
              <Route path="my-jobs" element={<MyJobs />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

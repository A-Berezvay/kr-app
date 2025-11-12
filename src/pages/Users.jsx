import React, { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function Users(){
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    email: '',
    role: 'user',
    status: 'invited',
    name: '',
  })

  useEffect(()=>{
    const col = collection(db, 'users')
    const unsub = onSnapshot(col, snap => {
      setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!form.email.trim()) return
    await addDoc(collection(db,'users'), {
      ...form,
      createdAt: serverTimestamp(),
    })
    setForm({ email: '', role: 'user', status: 'invited', name: '' })
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'users', id))
  }

  const toggleRole = async (u) => {
    const ref = doc(db,'users', u.id)
    await updateDoc(ref, { role: u.role === 'admin' ? 'user' : 'admin' })
  }

  const toggleStatus = async (u) => {
    const ref = doc(db,'users', u.id)
    const next = (u.status || 'invited') === 'active' ? 'invited' : 'active'
    await updateDoc(ref, { status: next })
  }

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => (u.status || 'invited') === 'active').length
    const admins = users.filter(u => (u.role || 'user') === 'admin').length
    return { total, active, admins }
  }, [users])

  const updateField = (field) => (e) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const formatDate = (user) => {
    if (!user.createdAt) return 'Just now'
    const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Users</h2>
        <p className="page-subtitle">Invite teammates and manage their permissions.</p>
      </header>
      <section className="stats-grid" aria-label="User overview">
        <article className="stat-card">
          <span className="stat-label">Team members</span>
          <span className="stat-value">{stats.total}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Active accounts</span>
          <span className="stat-value">{stats.active}</span>
          <span className="stat-caption">Currently able to sign in</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Admins</span>
          <span className="stat-value">{stats.admins}</span>
          <span className="stat-caption">With elevated permissions</span>
        </article>
      </section>
      <form onSubmit={add} className="panel form-grid" aria-label="Invite user">
        <label className="form-field">
          <span>Name</span>
          <input
            className="input"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Jordan Fisher"
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input
            className="input"
            value={form.email}
            onChange={updateField('email')}
            placeholder="name@example.com"
            type="email"
            required
          />
        </label>
        <label className="form-field">
          <span>Role</span>
          <select
            className="select"
            value={form.role}
            onChange={updateField('role')}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select
            className="select"
            value={form.status}
            onChange={updateField('status')}
          >
            <option value="invited">Invited</option>
            <option value="active">Active</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Invite user</button>
        </div>
      </form>
      <ul className="item-list">
        {users.map(u => (
          <li key={u.id} className="item">
            <div className="item-main">
              <div>
                <span className="item-title">{u.name || u.email}</span>
                <div className="item-meta">Invited {formatDate(u)}</div>
              </div>
              <div className="item-tags">
                <span className={`badge ${((u.status || 'invited') === 'active' ? 'badge-success' : 'badge-warning')}`}>{(u.status || 'invited').replace(/^\w/, s => s.toUpperCase())}</span>
                <span className="badge badge-muted">{(u.role || 'user').replace(/^\w/, s => s.toUpperCase())}</span>
              </div>
            </div>
            <div className="item-detail">
              <span className="item-label">Email</span>
              <span>{u.email}</span>
            </div>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>toggleRole(u)}>
                {(u.role || 'user') === 'admin' ? 'Set to user' : 'Promote to admin'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={()=>toggleStatus(u)}>
                {(u.status || 'invited') === 'active' ? 'Mark as invited' : 'Activate'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={()=>remove(u.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

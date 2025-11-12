import React, { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function Clients(){
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    name: '',
    contact: '',
    industry: 'general',
    status: 'active',
  })

  useEffect(()=>{
    const col = collection(db, 'clients')
    const unsub = onSnapshot(col, snap => {
      setClients(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!form.name.trim()) return
    await addDoc(collection(db,'clients'), {
      ...form,
      createdAt: serverTimestamp(),
    })
    setForm({ name: '', contact: '', industry: 'general', status: 'active' })
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'clients', id))
  }

  const stats = useMemo(() => {
    const total = clients.length
    const active = clients.filter(c => (c.status || 'active') === 'active').length
    const prospect = clients.filter(c => (c.status || 'active') === 'prospect').length
    return { total, active, prospect }
  }, [clients])

  const updateField = (field) => (e) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const formatDate = (client) => {
    if (!client.createdAt) return 'Just now'
    const date = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Clients</h2>
        <p className="page-subtitle">Keep track of every client your team works with.</p>
      </header>
      <section className="stats-grid" aria-label="Client overview">
        <article className="stat-card">
          <span className="stat-label">Total clients</span>
          <span className="stat-value">{stats.total}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Active retainers</span>
          <span className="stat-value">{stats.active}</span>
          <span className="stat-caption">Currently managed by the team</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Prospects</span>
          <span className="stat-value">{stats.prospect}</span>
          <span className="stat-caption">Leads in discussion stage</span>
        </article>
      </section>
      <form onSubmit={add} className="panel form-grid" aria-label="Add client">
        <label className="form-field">
          <span>Client name</span>
          <input
            className="input"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Acme Corporation"
            required
          />
        </label>
        <label className="form-field">
          <span>Point of contact</span>
          <input
            className="input"
            value={form.contact}
            onChange={updateField('contact')}
            placeholder="contact@acme.com"
            type="email"
          />
        </label>
        <label className="form-field">
          <span>Industry</span>
          <select className="select" value={form.industry} onChange={updateField('industry')}>
            <option value="general">General</option>
            <option value="technology">Technology</option>
            <option value="finance">Finance</option>
            <option value="marketing">Marketing</option>
            <option value="manufacturing">Manufacturing</option>
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select className="select" value={form.status} onChange={updateField('status')}>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Add client</button>
        </div>
      </form>
      <ul className="item-list">
        {clients.map(c => (
          <li key={c.id} className="item">
            <div className="item-main">
              <div>
                <span className="item-title">{c.name}</span>
                <div className="item-meta">Added {formatDate(c)}</div>
              </div>
              <div className="item-tags">
                <span className="badge badge-muted">{(c.industry || 'general').replace(/^\w/, s => s.toUpperCase())}</span>
                <span className={`badge ${((c.status || 'active') === 'active' && 'badge-success') || ((c.status || 'active') === 'prospect' && 'badge-warning') || 'badge-muted'}`}>
                  {(c.status || 'active').replace(/^\w/, s => s.toUpperCase())}
                </span>
              </div>
            </div>
            <div className="item-detail">
              <span className="item-label">Contact</span>
              <span>{c.contact || '—'}</span>
            </div>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>remove(c.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

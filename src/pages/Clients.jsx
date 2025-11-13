import React, { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getClientDisplayName } from '../lib/clients'

const initialFormState = {
  clientType: 'private',
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  notes: '',
  industry: 'general',
  status: 'active',
}

export default function Clients(){
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(initialFormState)

  useEffect(()=>{
    const col = collection(db, 'clients')
    const unsub = onSnapshot(col, snap => {
      setClients(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if (!form.contactName.trim()) return
    const derivedName = getClientDisplayName(form)
    await addDoc(collection(db,'clients'), {
      ...form,
      name: derivedName,
      createdAt: serverTimestamp(),
    })
    setForm(initialFormState)
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

  const getClientLabel = (client) => {
    if (client.clientType === 'commercial') {
      return (client.companyName || '').trim() || 'Commercial client'
    }
    return (client.contactName || '').trim() || 'Private client'
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
        <fieldset className="form-field">
          <span>Client type</span>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="clientType"
                value="private"
                checked={form.clientType === 'private'}
                onChange={updateField('clientType')}
              />
              <span>Private</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="clientType"
                value="commercial"
                checked={form.clientType === 'commercial'}
                onChange={updateField('clientType')}
              />
              <span>Commercial</span>
            </label>
          </div>
        </fieldset>

        {form.clientType === 'commercial' && (
          <label className="form-field">
            <span>Company name (optional)</span>
            <input
              className="input"
              value={form.companyName}
              onChange={updateField('companyName')}
              placeholder="Acme Corporation"
            />
          </label>
        )}

        <label className="form-field">
          <span>Name of contact</span>
          <input
            className="input"
            value={form.contactName}
            onChange={updateField('contactName')}
            placeholder="Jane Doe"
            required
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="jane@example.com"
          />
        </label>
        <label className="form-field">
          <span>Phone number</span>
          <input
            className="input"
            value={form.phone}
            onChange={updateField('phone')}
            placeholder="(555) 123-4567"
          />
        </label>
        <label className="form-field">
          <span>Address</span>
          <input
            className="input"
            value={form.address}
            onChange={updateField('address')}
            placeholder="123 Main St"
          />
        </label>
        <label className="form-field">
          <span>City</span>
          <input
            className="input"
            value={form.city}
            onChange={updateField('city')}
            placeholder="Springfield"
          />
        </label>
        <label className="form-field">
          <span>ZIP code</span>
          <input
            className="input"
            value={form.zip}
            onChange={updateField('zip')}
            placeholder="12345"
          />
        </label>
        <label className="form-field">
          <span>Notes</span>
          <textarea
            className="input"
            value={form.notes}
            onChange={updateField('notes')}
            placeholder="Access instructions, preferences…"
            rows={3}
          />
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
                <span className="item-title">{getClientLabel(c)}</span>
                <div className="item-meta">Added {formatDate(c)}</div>
              </div>
              <div className="item-tags">
                <span className="badge badge-muted">{(c.clientType || 'private').replace(/^\w/, s => s.toUpperCase())}</span>
                <span className={`badge ${((c.status || 'active') === 'active' && 'badge-success') || ((c.status || 'active') === 'prospect' && 'badge-warning') || 'badge-muted'}`}>
                  {(c.status || 'active').replace(/^\w/, s => s.toUpperCase())}
                </span>
              </div>
            </div>
            {c.contactName && (
              <div className="item-detail">
                <span className="item-label">Contact</span>
                <span>{c.contactName}</span>
              </div>
            )}
            {c.email && (
              <div className="item-detail">
                <span className="item-label">Email</span>
                <span>{c.email}</span>
              </div>
            )}
            {c.phone && (
              <div className="item-detail">
                <span className="item-label">Phone</span>
                <span>{c.phone}</span>
              </div>
            )}
            {(c.address || c.city || c.zip) && (
              <div className="item-detail">
                <span className="item-label">Location</span>
                <span>{[c.address, c.city, c.zip].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {c.notes && (
              <div className="item-detail">
                <span className="item-label">Notes</span>
                <span>{c.notes}</span>
              </div>
            )}
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

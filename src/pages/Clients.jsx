import React, { useEffect, useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
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

export default function Clients() {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(initialFormState)

  // editing state
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState(initialFormState)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const col = collection(db, 'clients')
    const unsub = onSnapshot(col, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!form.contactName.trim()) return
    const derivedName = getClientDisplayName(form)
    await addDoc(collection(db, 'clients'), {
      ...form,
      name: derivedName,
      createdAt: serverTimestamp(),
    })
    setForm(initialFormState)
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this client?')) return
    await deleteDoc(doc(db, 'clients', id))
  }

  const stats = useMemo(() => {
    const total = clients.length
    const active = clients.filter((c) => (c.status || 'active') === 'active').length
    const prospect = clients.filter((c) => (c.status || 'active') === 'prospect').length
    return { total, active, prospect }
  }, [clients])

  const updateField = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const updateEditField = (field) => (e) => {
    const value = e.target.value
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatDate = (client) => {
    if (!client.createdAt) return 'Just now'
    const date = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getClientLabel = (client) => {
    if (client.clientType === 'commercial') {
      return (client.companyName || '').trim() || 'Commercial client'
    }
    return (client.contactName || '').trim() || 'Private client'
  }

  const handleStatusChange = async (client, newStatus) => {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        status: newStatus,
      })
    } catch (error) {
      console.error('Failed to update status', error)
    }
  }

  const openEdit = (client) => {
    setEditingClient(client)
    setEditForm({
      clientType: client.clientType || 'private',
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      zip: client.zip || '',
      notes: client.notes || '',
      industry: client.industry || 'general',
      status: client.status || 'active',
    })
  }

  const closeEdit = () => {
    if (savingEdit) return
    setEditingClient(null)
    setEditForm(initialFormState)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingClient) return
    if (!editForm.contactName.trim()) return

    setSavingEdit(true)
    try {
      const derivedName = getClientDisplayName(editForm)
      await updateDoc(doc(db, 'clients', editingClient.id), {
        ...editForm,
        name: derivedName,
      })
      closeEdit()
    } catch (error) {
      console.error('Failed to update client', error)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Clients</h2>
        <p className="page-subtitle">Keep track of every client your team works with.</p>
      </header>

      {/* Stats */}
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

      {/* Add client form */}
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
          <button type="submit" className="btn btn-primary">
            Add client
          </button>
        </div>
      </form>

      {/* Client list */}
      <ul className="client-card-list">
        {clients.map((c) => {
          const status = c.status || 'active'
          const typeLabel = (c.clientType || 'private').replace(/^\w/, (s) => s.toUpperCase())
          const statusLabel = status.replace(/^\w/, (s) => s.toUpperCase())
          const statusBadgeClass =
            (status === 'active' && 'badge-success') ||
            (status === 'prospect' && 'badge-warning') ||
            'badge-muted'

          const location = [c.address, c.city, c.zip].filter(Boolean).join(', ')

          return (
            <li key={c.id} className="client-card">
              <header className="client-card-header">
                <div>
                  <h3 className="client-card-title">{getClientLabel(c)}</h3>
                  <p className="client-card-meta">Added {formatDate(c)}</p>
                </div>
                <div className="client-card-badges">
                  <span className="badge badge-muted">{typeLabel}</span>
                  <span className={`badge ${statusBadgeClass}`}>{statusLabel}</span>
                </div>
              </header>

              <div className="client-card-body">
                <div className="client-card-column">
                  <div className="client-card-field">
                    <span className="client-card-label">Contact</span>
                    <span className="client-card-value">{c.contactName || '—'}</span>
                  </div>
                  <div className="client-card-field">
                    <span className="client-card-label">Email</span>
                    <span className="client-card-value">{c.email || '—'}</span>
                  </div>
                  <div className="client-card-field">
                    <span className="client-card-label">Phone</span>
                    <span className="client-card-value">{c.phone || '—'}</span>
                  </div>
                </div>

                <div className="client-card-column">
                  <div className="client-card-field">
                    <span className="client-card-label">Location</span>
                    <span className="client-card-value">{location || '—'}</span>
                  </div>
                  <div className="client-card-field">
                    <span className="client-card-label">Notes</span>
                    <span className="client-card-value">
                      {c.notes && c.notes.trim().length ? c.notes : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <footer className="client-card-footer">
                <div className="client-card-status">
                  <span className="client-card-label">Status</span>
                  <select
                    className="select client-status-select"
                    value={status}
                    onChange={(e) => handleStatusChange(c, e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div className="client-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-danger"
                    onClick={() => remove(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </footer>
            </li>
          )
        })}
      </ul>

      {/* Edit modal */}
      {editingClient && (
        <ClientEditModal
          open={!!editingClient}
          form={editForm}
          onChangeField={updateEditField}
          onClose={closeEdit}
          onSubmit={handleSaveEdit}
          saving={savingEdit}
        />
      )}
    </section>
  )
}

function ClientEditModal({ open, form, onChangeField, onClose, onSubmit, saving }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={onSubmit}>
        <header className="modal-header">
          <h3>Edit client</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </header>
        <div className="modal-body">
          <fieldset className="form-field">
            <span>Client type</span>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="editClientType"
                  value="private"
                  checked={form.clientType === 'private'}
                  onChange={onChangeField('clientType')}
                />
                <span>Private</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="editClientType"
                  value="commercial"
                  checked={form.clientType === 'commercial'}
                  onChange={onChangeField('clientType')}
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
                onChange={onChangeField('companyName')}
              />
            </label>
          )}

          <label className="form-field">
            <span>Name of contact</span>
            <input
              className="input"
              value={form.contactName}
              onChange={onChangeField('contactName')}
              required
            />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={onChangeField('email')}
            />
          </label>
          <label className="form-field">
            <span>Phone number</span>
            <input
              className="input"
              value={form.phone}
              onChange={onChangeField('phone')}
            />
          </label>
          <label className="form-field">
            <span>Address</span>
            <input
              className="input"
              value={form.address}
              onChange={onChangeField('address')}
            />
          </label>
          <label className="form-field">
            <span>City</span>
            <input
              className="input"
              value={form.city}
              onChange={onChangeField('city')}
            />
          </label>
          <label className="form-field">
            <span>ZIP code</span>
            <input
              className="input"
              value={form.zip}
              onChange={onChangeField('zip')}
            />
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.notes}
              onChange={onChangeField('notes')}
            />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select
              className="select"
              value={form.status}
              onChange={onChangeField('status')}
            >
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
              <option value="lost">Lost</option>
            </select>
          </label>
        </div>
        <footer className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </form>
    </div>
  )
}

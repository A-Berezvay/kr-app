import React, { useEffect, useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { getClientDisplayName } from '../../lib/clients'

const emptyForm = {
  clientId: '',
  dateTime: '',
  durationMinutes: 60,
  status: 'scheduled',
  notes: '',
  assignedUserIds: [],
}

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const toDateTimeLocal = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : value.toDate ? value.toDate() : new Date(value)
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export default function JobModal({ open, onClose, onSubmit, clients, cleaners, initialJob, saving }) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!open) return
    if (initialJob) {
      setForm({
        clientId: initialJob.clientId || '',
        dateTime: toDateTimeLocal(initialJob.date),
        durationMinutes: initialJob.durationMinutes || 60,
        status: initialJob.status || 'scheduled',
        notes: initialJob.notes || '',
        assignedUserIds: initialJob.assignedUserIds || [],
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, initialJob])

  const handleChange = (field) => (event) => {
    const value =
      field === 'durationMinutes' ? Number(event.target.value) : event.target.value
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleCleaner = (id) => {
    setForm((prev) => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(id)
        ? prev.assignedUserIds.filter((cleanerId) => cleanerId !== id)
        : [...prev.assignedUserIds, id],
    }))
  }

  const activeCleaners = useMemo(
    () => cleaners.filter((cleaner) => (cleaner.status || 'invited') === 'active' && cleaner.role === 'cleaner'),
    [cleaners],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.clientId || !form.dateTime) return
    const scheduledDate = new Date(form.dateTime)
    const payload = {
      clientId: form.clientId,
      date: Timestamp.fromDate(scheduledDate),
      durationMinutes: Number(form.durationMinutes) || 60,
      status: form.status,
      notes: form.notes,
      assignedUserIds: form.assignedUserIds,
    }
    onSubmit(payload)
  }

  if (!open) return null

  const client = clients.find((item) => item.id === form.clientId)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h3>{initialJob ? 'Edit job' : 'Create job'}</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body job-modal-body">
          <label className="form-field">
            <span>Client</span>
            <select className="select" value={form.clientId} onChange={handleChange('clientId')} required>
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {getClientDisplayName(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              className="input"
              value={form.dateTime}
              onChange={handleChange('dateTime')}
              required
            />
          </label>
          <label className="form-field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              className="input"
              min="15"
              step="15"
              value={form.durationMinutes}
              onChange={handleChange('durationMinutes')}
            />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="select" value={form.status} onChange={handleChange('status')}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Access instructions, alarm code, supplies, etc."
            />
          </label>
          <div className="form-field">
            <span>Assign cleaners</span>
            <div className="option-list">
              {activeCleaners.map((cleaner) => (
                <label key={cleaner.id} className="option-item">
                  <input
                    type="checkbox"
                    checked={form.assignedUserIds.includes(cleaner.id)}
                    onChange={() => toggleCleaner(cleaner.id)}
                  />
                  <div>
                    <span className="option-title">{cleaner.displayName || cleaner.email}</span>
                    {cleaner.email && cleaner.displayName && (
                      <span className="option-subtitle">{cleaner.email}</span>
                    )}
                  </div>
                </label>
              ))}
              {activeCleaners.length === 0 && (
                <p className="empty-state">No active cleaners available.</p>
              )}
            </div>
          </div>
          {client?.address && (
            <div className="info-note">
              <strong>Client address:</strong> {client.address}
              {client.notes && <div className="helper-text">Notes: {client.notes}</div>}
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : initialJob ? 'Update job' : 'Create job'}
          </button>
        </footer>
      </form>
    </div>
  )
}

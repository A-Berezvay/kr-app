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
  jobLocationId: '',
  jobLocationLabel: '',
  jobLocationAddress: '',
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

// helper: normalise client.locations into array of { id, label, address }
const normalizeLocations = (client) => {
  const raw = Array.isArray(client?.locations) ? client.locations : []
  return raw.map((loc, index) => {
    if (typeof loc === 'string') {
      return {
        id: String(index),
        label: loc,
        address: loc,
      }
    }
    return {
      id: loc.id || String(index),
      label: loc.label || loc.address || `Location ${index + 1}`,
      address: loc.address || loc.label || '',
    }
  })
}

export default function JobModal({
  open,
  onClose,
  onSubmit,
  clients,
  cleaners,
  initialJob,
  saving,
}) {
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
        jobLocationId: initialJob.jobLocationId || '',
        jobLocationLabel: initialJob.jobLocationLabel || '',
        jobLocationAddress: initialJob.jobLocationAddress || '',
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
    () =>
      cleaners.filter(
        (cleaner) => (cleaner.status || 'invited') === 'active' && cleaner.role === 'cleaner',
      ),
    [cleaners],
  )

  const client = useMemo(
    () => clients.find((item) => item.id === form.clientId),
    [clients, form.clientId],
  )

  const clientLocations = useMemo(() => normalizeLocations(client), [client])

  // when user changes location in the select
  const handleLocationChange = (event) => {
    const locationId = event.target.value
    const location = clientLocations.find((loc) => loc.id === locationId) || null

    setForm((prev) => ({
      ...prev,
      jobLocationId: location ? location.id : '',
      jobLocationLabel: location ? location.label : '',
      jobLocationAddress: location ? location.address : '',
    }))
  }

  // optional: if client has exactly one location and none selected yet, auto-select it
  useEffect(() => {
    if (!client) {
      return
    }
    const locs = clientLocations
    if (locs.length === 1 && !form.jobLocationId) {
      const only = locs[0]
      setForm((prev) => ({
        ...prev,
        jobLocationId: only.id,
        jobLocationLabel: only.label,
        jobLocationAddress: only.address,
      }))
    }
  }, [client, clientLocations, form.jobLocationId])

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
      // new fields for per-job location
      jobLocationId: form.jobLocationId || null,
      jobLocationLabel: form.jobLocationLabel || null,
      jobLocationAddress: form.jobLocationAddress || null,
    }
    onSubmit(payload)
  }

  if (!open) return null

  const infoAddress = form.jobLocationAddress || client?.address || ''
  const infoLabel =
    form.jobLocationLabel ||
    (clientLocations.length === 1 ? clientLocations[0].label : '') ||
    ''

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
            <select
              className="select"
              value={form.clientId}
              onChange={(e) => {
                // reset location when switching client
                const value = e.target.value
                setForm((prev) => ({
                  ...prev,
                  clientId: value,
                  jobLocationId: '',
                  jobLocationLabel: '',
                  jobLocationAddress: '',
                }))
              }}
              required
            >
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

          {clientLocations.length > 0 && (
            <label className="form-field">
              <span>Location</span>
              <select
                className="select"
                value={form.jobLocationId}
                onChange={handleLocationChange}
              >
                <option value="">
                  {clientLocations.length > 1 ? 'Select a location' : 'Default location'}
                </option>
                {clientLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </label>
          )}

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
                    <span className="option-title">
                      {cleaner.displayName || cleaner.email}
                    </span>
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

          {infoAddress && (
            <div className="info-note">
              <strong>Job address:</strong> {infoAddress}
              {infoLabel && <div className="helper-text">Location: {infoLabel}</div>}
              {client?.notes && (
                <div className="helper-text">Client notes: {client.notes}</div>
              )}
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

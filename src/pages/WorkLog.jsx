import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import Toast from '../components/common/Toast'
import { useAuth } from '../services/auth'
import {
  endOfMonth,
  formatDateWithWeekday,
  formatDuration,
  formatMonthLabel,
  formatTime,
  startOfMonth,
} from '../lib/dates'
import {
  deleteWorkLogEntry,
  subscribeToWorkLogs,
  updateWorkLogEntry,
  createManualWorkLog,
} from '../services/workLogs'

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

const toDate = (value) => {
  if (!value) return null
  return value.toDate ? value.toDate() : new Date(value)
}

const toDateTimeLocal = (date) => {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export default function WorkLog() {
  const { user } = useAuth()
  const roleContext = useOutletContext() || {}
  const isAdmin = Boolean(roleContext.isAdmin)

  const [monthOffset, setMonthOffset] = useState(0)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // editing state (admin only)
  const [editingEntry, setEditingEntry] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // manual-add state (admin only)
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [savingManual, setSavingManual] = useState(false)

  const currentMonth = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setHours(0, 0, 0, 0)
    base.setMonth(base.getMonth() + monthOffset)
    return base
  }, [monthOffset])

  const monthRange = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return { start, end }
  }, [currentMonth])

  const queryUserId = isAdmin ? null : user?.uid

  // Subscribe to work logs
  useEffect(() => {
    if (!user) return () => {}
    setLoading(true)
    const unsub = subscribeToWorkLogs(
      {
        start: monthRange.start,
        end: monthRange.end,
        userId: queryUserId,
      },
      (snapshot) => {
        setLogs(mapSnapshot(snapshot))
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setToast({ type: 'error', message: 'Failed to load work logs.' })
        setLoading(false)
      },
    )
    return () => {
      unsub?.()
    }
  }, [monthRange, queryUserId, user])

  // Load users & clients for manual entry (admins only)
  useEffect(() => {
    if (!isAdmin) return

    const usersQuery = query(collection(db, 'users'), orderBy('email', 'asc'))
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      setUsers(mapSnapshot(snap))
    })

    const clientsQuery = query(collection(db, 'clients'), orderBy('name', 'asc'))
    const unsubClients = onSnapshot(clientsQuery, (snap) => {
      setClients(mapSnapshot(snap))
    })

    return () => {
      unsubUsers()
      unsubClients()
    }
  }, [isAdmin])

  const getEntryDuration = (entry) => {
    if (entry.durationMinutes) return entry.durationMinutes
    const start = toDate(entry.startTime)
    const end = toDate(entry.endTime)
    if (!start || !end) return 0
    return Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0)
  }

  const totalMinutes = useMemo(
    () => logs.reduce((sum, entry) => sum + getEntryDuration(entry), 0),
    [logs],
  )

  const totalHours = useMemo(() => Math.round((totalMinutes / 60) * 10) / 10, [totalMinutes])

  // --- per-user breakdown for admins ---
  const perUserTotals = useMemo(() => {
    const map = new Map()
    logs.forEach((entry) => {
      const key = entry.userId || entry.userEmail || 'unknown'
      const label = entry.userName || entry.userEmail || entry.userId || 'Unknown'
      const minutes = getEntryDuration(entry)
      const existing = map.get(key) || { key, label, minutes: 0 }
      existing.minutes += minutes
      map.set(key, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes)
  }, [logs])

  const canDeleteEntry = (entry) => isAdmin

  const handleDelete = async (entry) => {
    if (!canDeleteEntry(entry)) return
    if (!window.confirm('Delete this work log entry?')) return
    setDeletingId(entry.id)
    try {
      await deleteWorkLogEntry(entry.id)
      setToast({ type: 'success', message: 'Entry removed.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to remove entry.' })
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (entry) => {
    if (!isAdmin) return
    const start = toDate(entry.startTime)
    const end = toDate(entry.endTime)
    setEditingEntry(entry)
    setEditForm({
      startTime: start ? toDateTimeLocal(start) : '',
      endTime: end ? toDateTimeLocal(end) : '',
      notes: entry.notes || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingEntry || !editForm) return
    setSavingEdit(true)
    try {
      const start = editForm.startTime ? new Date(editForm.startTime) : null
      const end = editForm.endTime ? new Date(editForm.endTime) : null
      const workDate = start || end || new Date()

      let durationMinutes = 0
      if (start && end) {
        durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0)
      }

      await updateWorkLogEntry(editingEntry.id, {
        workDate,
        startTime: start,
        endTime: end,
        durationMinutes,
        notes: editForm.notes,
      })

      setToast({ type: 'success', message: 'Work log updated.' })
      setEditingEntry(null)
      setEditForm(null)
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to update entry.' })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateManualLog = async (payload) => {
    setSavingManual(true)
    try {
      await createManualWorkLog(payload)
      setToast({ type: 'success', message: 'Work log added.' })
      setManualModalOpen(false)
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to add work log.' })
    } finally {
      setSavingManual(false)
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Work log</h2>
        <p className="page-subtitle">
          Track exact hours spent on jobs. Entries are grouped by month for quick payroll review.
        </p>
      </header>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
      <div className="panel">
        <div className="worklog-header">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous month"
            onClick={() => setMonthOffset((prev) => prev - 1)}
          >
            ‹
          </button>
          <div className="worklog-header-text">
            <h3>{formatMonthLabel(currentMonth)}</h3>
            <p className="helper-text">
              {loading ? 'Calculating totals…' : `Total logged: ${totalHours.toFixed(1)} hrs`}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Next month"
            onClick={() => setMonthOffset((prev) => prev + 1)}
          >
            ›
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => setManualModalOpen(true)}
            >
              Add work log
            </button>
          )}
        </div>
        <p className="helper-text">
          Hours are captured automatically when cleaners start and complete jobs from the My Jobs
          page.
        </p>

        {/* Admin-only breakdown by team member */}
        {isAdmin && !loading && logs.length > 0 && (
          <div className="worklog-summary">
            <h4>By team member</h4>
            <ul className="worklog-summary-list">
              {perUserTotals.map((item) => (
                <li key={item.key} className="worklog-summary-item">
                  <span>{item.label}</span>
                  <span className="helper-text">
                    {(item.minutes / 60).toFixed(1)} hrs ({formatDuration(item.minutes)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <p>Loading work logs…</p>
        ) : logs.length === 0 ? (
          <p className="empty-state">No hours logged for this month yet.</p>
        ) : (
          <div className="worklog-list">
            {logs.map((entry) => {
              const workDate = toDate(entry.workDate)
              const start = toDate(entry.startTime)
              const end = toDate(entry.endTime)
              const durationLabel = formatDuration(getEntryDuration(entry))
              return (
                <article key={entry.id} className="worklog-entry">
                  <div className="worklog-entry-main">
                    <div>
                      <h4>{formatDateWithWeekday(workDate || start || new Date())}</h4>
                      <p className="helper-text">
                        {start && end
                          ? `${formatTime(start)} – ${formatTime(end)}`
                          : 'Awaiting timestamps'}
                      </p>
                      {entry.clientName && (
                        <p className="helper-text">Client: {entry.clientName}</p>
                      )}
                      {entry.notes && <p className="helper-text">Notes: {entry.notes}</p>}
                    </div>
                    <div className="worklog-entry-meta">
                      {isAdmin && (
                        <span className="badge">
                          {entry.userName || entry.userEmail || entry.userId}
                        </span>
                      )}
                      <span className="badge badge-soft">{durationLabel}</span>
                    </div>
                  </div>
                  <div className="worklog-entry-actions">
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openEdit(entry)}
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteEntry(entry) && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleDelete(entry)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id ? 'Removing…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Admin edit modal */}
      {isAdmin && editingEntry && editForm && (
        <EditWorkLogModal
          open={Boolean(editingEntry)}
          form={editForm}
          setForm={setEditForm}
          onClose={() => {
            if (savingEdit) return
            setEditingEntry(null)
            setEditForm(null)
          }}
          onSave={handleSaveEdit}
          saving={savingEdit}
        />
      )}

      {/* Admin manual-create modal */}
      {isAdmin && (
        <ManualWorkLogModal
          open={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          onSave={handleCreateManualLog}
          users={users}
          clients={clients}
          defaultDate={currentMonth}
          saving={savingManual}
        />
      )}
    </section>
  )
}

// -------- Edit existing entry modal --------
function EditWorkLogModal({ open, form, setForm, onClose, onSave, saving }) {
  if (!open) return null

  const updateField = (field) => (event) => {
    const { value } = event.target
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h3>Edit work log</h3>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            ×
          </button>
        </header>
        <div className="modal-body">
          <label className="form-field">
            <span>Start time</span>
            <input
              type="datetime-local"
              className="input"
              value={form.startTime}
              onChange={updateField('startTime')}
            />
          </label>
          <label className="form-field">
            <span>End time</span>
            <input
              type="datetime-local"
              className="input"
              value={form.endTime}
              onChange={updateField('endTime')}
            />
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.notes}
              onChange={updateField('notes')}
              placeholder="Manual adjustments, sick leave, comments…"
            />
          </label>
          <p className="helper-text">
            Duration is recalculated automatically from start and end times when you save.
          </p>
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
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

// -------- Create manual entry modal --------
function ManualWorkLogModal({
  open,
  onClose,
  onSave,
  users,
  clients,
  defaultDate,
  saving,
}) {
  const [userId, setUserId] = useState('')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    // reset form when opening
    setUserId('')
    setClientId('')
    const iso = defaultDate.toISOString().slice(0, 10)
    setDate(iso)
    setStartTime('')
    setEndTime('')
    setNotes('')
  }, [open, defaultDate])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!userId || !clientId || !date || !startTime || !endTime) return

    const user = users.find((u) => u.id === userId)
    const client = clients.find((c) => c.id === clientId)

    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)

    onSave({
      userId,
      userName: user?.name || user?.displayName || user?.email,
      userEmail: user?.email || null,
      clientId,
      clientName: client?.name || client?.companyName || client?.contactName,
      workDate: start,
      startTime: start,
      endTime: end,
      notes,
    })
  }

  const activeUsers = users.filter((u) => (u.status || 'active') === 'active')
  const sortedUsers = [...activeUsers].sort((a, b) =>
    (a.name || a.displayName || a.email || '').localeCompare(
      b.name || b.displayName || b.email || '',
    ),
  )

  const sortedClients = [...clients].sort((a, b) =>
    (a.name || a.companyName || a.contactName || '').localeCompare(
      b.name || b.companyName || b.contactName || '',
    ),
  )

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h3>Add work log</h3>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            ×
          </button>
        </header>
        <div className="modal-body">
          <label className="form-field">
            <span>Team member</span>
            <select
              className="select"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Select user</option>
              {sortedUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.displayName || u.email}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Client</span>
            <select
              className="select"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Select client</option>
              {sortedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.companyName || c.contactName}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Date</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Start time</span>
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>End time</span>
            <input
              type="time"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Notes</span>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: what was done, special circumstances…"
            />
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
            {saving ? 'Saving…' : 'Add work log'}
          </button>
        </footer>
      </form>
    </div>
  )
}


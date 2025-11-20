import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  endOfDay,
  formatDayLabel,
  formatDuration,
  formatTime,
  getRollingWeekRange,
  startOfDay,
} from '../../lib/dates'
import { getClientDisplayName } from '../../lib/clients'

const statusLabels = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const statusClass = {
  scheduled: 'badge-soft',
  in_progress: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-muted',
}

const toTimestamp = (v) =>
  !v ? null : v instanceof Timestamp ? v : Timestamp.fromDate(v instanceof Date ? v : new Date(v))

const extractIndexLink = (m = '') => (m.match(/https:\/\/console\.firebase\.google\.com[^\s)]+/) || [null])[0]

/**
 * Accepts `users` (admins + cleaners). Falls back to `cleaners` if `users` not provided.
 */
export default function JobList({
  filters = {},
  clients = [],
  cleaners = [],
  users = [],
  onAssign,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  actionJobId,
}) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const range = filters.range || 'today'
  const status = filters.status || 'all'
  const clientId = filters.clientId || ''
  const cleanerIds = Array.isArray(filters.cleanerIds) ? filters.cleanerIds : []
  const cleanerKey = cleanerIds.slice().sort().join('|')

  const dateBounds = useMemo(() => {
    if (range === 'week') return getRollingWeekRange()
    if (range === 'today') {
      const today = new Date()
      return { start: startOfDay(today), end: endOfDay(today) }
    }
    return { start: null, end: null }
  }, [range])

  const clientMap = useMemo(() => {
    const m = new Map()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  // Build a map from ALL assignable users (admins + cleaners)
  const allPeople = users.length ? users : cleaners
  const userMap = useMemo(() => {
    const m = new Map()
    allPeople.forEach((u) => m.set(u.id, u))
    return m
  }, [allPeople])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const startTs = toTimestamp(dateBounds.start)
    const endTs = toTimestamp(dateBounds.end)

    const constraints = []
    if (startTs) constraints.push(where('date', '>=', startTs))
    if (endTs) constraints.push(where('date', '<=', endTs))
    if (status && status !== 'all') constraints.push(where('status', '==', status))
    if (clientId) constraints.push(where('clientId', '==', clientId))
    if (cleanerIds.length) constraints.push(where('assignedUserIds', 'array-contains-any', cleanerIds))
    constraints.push(orderBy('date', 'asc'))

    const q = query(collection(db, 'jobs'), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError(err)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [
    range,
    status,
    clientId,
    cleanerKey,
    dateBounds.start?.getTime(),
    dateBounds.end?.getTime(),
  ])

  const grouped = useMemo(() => {
    const groups = new Map()
    jobs.forEach((job) => {
      const d = job.date?.toDate ? job.date.toDate() : job.date
      if (!d) return
      const key = startOfDay(d).toISOString()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ ...job, date: d })
    })
    return Array.from(groups.entries())
      .map(([day, list]) => ({
        day: new Date(day),
        jobs: list.sort((a, b) => a.date - b.date),
      }))
      .sort((a, b) => a.day - b.day)
  }, [jobs])

  if (loading)
    return (
      <div className="panel">
        <p>Loading jobs…</p>
      </div>
    )

  if (error) {
    const indexLink = extractIndexLink(error.message)
    return (
      <div className="panel error-state">
        <p>Unable to load jobs: {error.message}</p>
        {indexLink && (
          <p>
            <a href={indexLink} target="_blank" rel="noreferrer">
              Create required Firestore index
            </a>
          </p>
        )}
      </div>
    )
  }

  if (!jobs.length)
    return (
      <div className="panel empty-state">
        <p>No jobs scheduled for this range.</p>
      </div>
    )

  return (
    <div className="job-groups">
      {grouped.map((group) => (
        <section key={group.day.toISOString()} className="job-group">
          <header className="job-group-header">
            <h3>{formatDayLabel(group.day)}</h3>
            <span>{group.day.toLocaleDateString()}</span>
          </header>

          <div className="job-group-list">
            {group.jobs.map((job) => {
              const normalizedClientId = job.clientId || job.client_id
              const client = clientMap.get(normalizedClientId)
              const clientName = job.clientName || job.client_name || getClientDisplayName(client)

              const assigned = (job.assignedUserIds || [])
                .map((id) => userMap.get(id))
                .filter(Boolean)

              const jobStatus = job.status || 'scheduled'
              const disableStart = jobStatus !== 'scheduled'
              const disableComplete = jobStatus === 'completed' || jobStatus === 'cancelled'
              const jobDate = job.date?.toDate ? job.date.toDate() : job.date

              const statusClassName = statusClass[jobStatus] || 'badge-muted'
              const statusLabel = statusLabels[jobStatus] || jobStatus
              const timeLabel = jobDate ? formatTime(jobDate) : '—'
              const durationLabel = formatDuration(job.durationMinutes)

              return (
                <article key={job.id} className="job-card">
                  <header className="job-card-header">
                    <div className="job-card-header-main">
                      <p className="job-card-time">
                        {timeLabel} · {durationLabel}
                      </p>
                    </div>
                    <span className={`badge ${statusClassName}`}>{statusLabel}</span>
                  </header>

                  <div className="job-card-body">
                    <div className="job-card-client">
                      <h4>{clientName}</h4>
                      {client?.address && (
                        <p className="job-card-address">{client.address}</p>
                      )}

                      <div className="job-card-assignees">
                        {assigned.length ? (
                          assigned.map((p) => (
                            <span key={p.id} className="chip">
                              {p.displayName || p.email}
                            </span>
                          ))
                        ) : (
                          <span className="helper-text">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {job.notes && (
                      <p className="job-card-notes">{job.notes}</p>
                    )}
                  </div>

                  <footer className="job-card-footer">
                    {onAssign && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => onAssign(job)}
                      >
                        Assign
                      </button>
                    )}
                    {onStart && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => onStart(job)}
                        disabled={disableStart || actionJobId === job.id}
                      >
                        {actionJobId === job.id && !disableStart ? 'Starting…' : 'Start'}
                      </button>
                    )}
                    {onComplete && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => onComplete(job)}
                        disabled={disableComplete || actionJobId === job.id}
                      >
                        {actionJobId === job.id && !disableComplete ? 'Completing…' : 'Complete'}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => onEdit(job)}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="btn btn-ghost btn-danger"
                        type="button"
                        onClick={() => onDelete(job)}
                      >
                        Delete
                      </button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

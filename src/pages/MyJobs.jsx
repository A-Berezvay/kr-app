import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../services/auth'
import Toast from '../components/common/Toast'
import {
  endOfToday,
  formatDayLabel,
  formatDuration,
  formatTime,
  getRollingWeekRange,
  startOfToday,
} from '../lib/dates'
import { markJobCompleted, markJobStarted, subscribeToCleanerJobs } from '../services/jobs'

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

export default function MyJobs() {
  const { user } = useAuth()
  const [tab, setTab] = useState('today')
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [actionJobId, setActionJobId] = useState(null)

  useEffect(() => {
    const clientsQuery = query(collection(db, 'clients'), orderBy('name', 'asc'))
    const unsub = onSnapshot(clientsQuery, (snapshot) => {
      setClients(mapSnapshot(snapshot))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    const { start, end } =
      tab === 'today'
        ? { start: startOfToday(), end: endOfToday() }
        : getRollingWeekRange()
    setLoading(true)
    const unsub = subscribeToCleanerJobs(
      { uid: user.uid, start, end },
      (snapshot) => {
        setJobs(mapSnapshot(snapshot))
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setToast({ type: 'error', message: 'Failed to load jobs.' })
        setLoading(false)
      },
    )
    return () => {
      unsub?.()
    }
  }, [user, tab])

  const clientMap = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => map.set(client.id, client))
    return map
  }, [clients])

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date)
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date)
      return dateA - dateB
    })
  }, [jobs])

  const handleStart = async (job) => {
    setActionJobId(job.id)
    try {
      await markJobStarted(job.id)
      setToast({ type: 'success', message: 'Job marked as in progress.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to update job status.' })
    } finally {
      setActionJobId(null)
    }
  }

  const handleComplete = async (job) => {
    setActionJobId(job.id)
    try {
      await markJobCompleted(job.id)
      setToast({ type: 'success', message: 'Job marked as complete.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to update job status.' })
    } finally {
      setActionJobId(null)
    }
  }

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast({ type: 'success', message: 'Address copied.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Copy not supported on this browser.' })
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>My jobs</h2>
        <p className="page-subtitle">Review and complete your assigned jobs.</p>
      </header>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`tab-button ${tab === 'today' ? 'is-active' : ''}`}
          onClick={() => setTab('today')}
          aria-selected={tab === 'today'}
        >
          Today
        </button>
        <button
          type="button"
          role="tab"
          className={`tab-button ${tab === 'week' ? 'is-active' : ''}`}
          onClick={() => setTab('week')}
          aria-selected={tab === 'week'}
        >
          This week
        </button>
      </div>
      {loading ? (
        <div className="panel">
          <p>Loading jobs…</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="panel empty-state">
          <p>No jobs scheduled for this period.</p>
        </div>
      ) : (
        <div className="job-card-list">
          {sortedJobs.map((job) => {
            const jobDate = job.date?.toDate ? job.date.toDate() : new Date(job.date)
            const client = clientMap.get(job.clientId)
            const status = job.status || 'scheduled'
            const disableStart = status !== 'scheduled'
            const disableComplete = status === 'completed' || status === 'cancelled'
            return (
              <article key={job.id} className="panel my-job-card">
                <header className="my-job-header">
                  <div>
                    <h3>{formatDayLabel(jobDate)}</h3>
                    <p>{formatTime(jobDate)} · {formatDuration(job.durationMinutes)}</p>
                  </div>
                  <span className={`badge ${statusClass(status)}`}>{statusLabel(status)}</span>
                </header>
                <div className="my-job-body">
                  <div className="my-job-client">
                    <strong>{client?.name || 'Unknown client'}</strong>
                    {client?.address && (
                      <div className="address-row">
                        <span>{client.address}</span>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => handleCopy(client.address)}
                          aria-label="Copy address"
                        >
                          📋
                        </button>
                      </div>
                    )}
                    {client?.notes && <p className="helper-text">{client.notes}</p>}
                  </div>
                  {job.notes && <p className="my-job-notes">{job.notes}</p>}
                </div>
                <footer className="my-job-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleStart(job)}
                    disabled={disableStart || actionJobId === job.id}
                  >
                    {actionJobId === job.id && !disableStart ? 'Starting…' : 'Start'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleComplete(job)}
                    disabled={disableComplete || actionJobId === job.id}
                  >
                    {actionJobId === job.id && !disableComplete ? 'Completing…' : 'Complete'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function statusClass(status) {
  switch (status) {
    case 'completed':
      return 'badge-success'
    case 'in_progress':
      return 'badge-info'
    case 'cancelled':
      return 'badge-muted'
    default:
      return 'badge-soft'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In progress'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Scheduled'
  }
}


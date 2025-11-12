import React, { useMemo } from 'react'
import { formatDayLabel, formatDuration, formatTime, startOfDay } from '../../lib/dates'

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

export default function JobList({
  jobs,
  clients,
  cleaners,
  loading,
  onAssign,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  actionJobId,
}) {
  const grouped = useMemo(() => {
    const groups = new Map()
    jobs.forEach((job) => {
      const date = job.date?.toDate ? job.date.toDate() : job.date
      const start = startOfDay(date).toISOString()
      if (!groups.has(start)) {
        groups.set(start, [])
      }
      groups.get(start).push({ ...job, date: date })
    })
    return Array.from(groups.entries())
      .map(([day, list]) => ({
        day: new Date(day),
        jobs: list.sort((a, b) => a.date - b.date),
      }))
      .sort((a, b) => a.day - b.day)
  }, [jobs])

  if (loading) {
    return (
      <div className="panel">
        <p>Loading jobs…</p>
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="panel empty-state">
        <p>No jobs scheduled for this range.</p>
      </div>
    )
  }

  const clientMap = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => map.set(client.id, client))
    return map
  }, [clients])

  const cleanerMap = useMemo(() => {
    const map = new Map()
    cleaners.forEach((cleaner) => map.set(cleaner.id, cleaner))
    return map
  }, [cleaners])

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
              const client = clientMap.get(job.clientId)
              const assigned = (job.assignedUserIds || []).map((id) => cleanerMap.get(id))
              const assignedCleaners = assigned.filter(Boolean)
              const jobStatus = job.status || 'scheduled'
              const disableStart = jobStatus !== 'scheduled'
              const disableComplete = jobStatus === 'completed' || jobStatus === 'cancelled'
              return (
                <article key={job.id} className="job-item">
                  <div className="job-time">
                    <strong>{formatTime(job.date)}</strong>
                    <span>{formatDuration(job.durationMinutes)}</span>
                  </div>
                  <div className="job-main">
                    <h4>{client?.name || 'Unknown client'}</h4>
                    {client?.address && <p className="job-address">{client.address}</p>}
                    {job.notes && <p className="job-notes">{job.notes}</p>}
                  </div>
                  <div className="job-assignees">
                    {assignedCleaners.length
                      ? assignedCleaners.map((cleaner) => (
                          <span key={cleaner.id} className="chip">
                            {cleaner.displayName || cleaner.email}
                          </span>
                        ))
                      : <span className="helper-text">Unassigned</span>}
                  </div>
                  <div className={`job-status badge ${statusClass[jobStatus] || 'badge-muted'}`}>
                    {statusLabels[jobStatus] || jobStatus}
                  </div>
                  <div className="job-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => onAssign(job)}>
                      Assign
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onStart(job)}
                      disabled={disableStart || actionJobId === job.id}
                    >
                      {actionJobId === job.id && !disableStart ? 'Starting…' : 'Start'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onComplete(job)}
                      disabled={disableComplete || actionJobId === job.id}
                    >
                      {actionJobId === job.id && !disableComplete ? 'Completing…' : 'Complete'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => onEdit(job)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger"
                      onClick={() => onDelete(job)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

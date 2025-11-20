// src/components/calendar/JobCalendar.jsx
import React, { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { formatDuration } from '../../lib/dates'
import { getClientDisplayName } from '../../lib/clients'

function ensureDate(value) {
  if (!value) return null
  if (value.toDate) return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

export default function JobCalendar({
  jobs = [],
  clients = [],
  users = [],
  mode = 'admin', // 'admin' | 'cleaner'
  onRangeChange,
}) {
  const clientMap = useMemo(() => {
    const m = new Map()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const userMap = useMemo(() => {
    const m = new Map()
    users.forEach((u) => m.set(u.id, u))
    return m
  }, [users])

  const events = useMemo(
    () =>
      jobs
        .map((job) => {
          const start = ensureDate(job.date)
          if (!start) return null

          const durationMinutes = job.durationMinutes || 60
          const end = new Date(start.getTime() + durationMinutes * 60000)

          const client = clientMap.get(job.clientId)
          const title =
            (job.clientName ||
              getClientDisplayName(client) ||
              'Job')
              .trim() || 'Job'

          const status = job.status || 'scheduled'

          let backgroundColor = '#e5e7eb'
          let borderColor = '#d1d5db'
          if (status === 'completed') {
            backgroundColor = '#bbf7d0'
            borderColor = '#16a34a'
          } else if (status === 'in_progress') {
            backgroundColor = '#bfdbfe'
            borderColor = '#2563eb'
          } else if (status === 'cancelled') {
            backgroundColor = '#fee2e2'
            borderColor = '#b91c1c'
          }

          const assignedUsers = (job.assignedUserIds || [])
            .map((id) => userMap.get(id))
            .filter(Boolean)
            .map((u) => u.displayName || u.email)
            .join(', ')

          return {
            id: job.id,
            title,
            start,
            end,
            backgroundColor,
            borderColor,
            extendedProps: {
              job,
              client,
              status,
              assignedUsers,
            },
          }
        })
        .filter(Boolean),
    [jobs, clientMap, userMap],
  )

  const handleDatesSet = (arg) => {
    if (!onRangeChange) return
    onRangeChange({
      start: arg.start,
      end: arg.end,
    })
  }

  const renderEventContent = (info) => {
    const { job, assignedUsers } = info.event.extendedProps
    const durationLabel = formatDuration(job.durationMinutes || 60)

    return (
      <div className="fc-job-event">
        <div className="fc-job-title">
          <strong>{info.event.title}</strong>
        </div>
        <div className="fc-job-meta">
          {info.timeText && <span>{info.timeText}</span>}
          <span>· {durationLabel}</span>
        </div>
        {mode === 'admin' && assignedUsers && (
          <div className="fc-job-assignees">
            <span>{assignedUsers}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        height="auto"
        firstDay={1}             // Monday
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        nowIndicator
        events={events}
        datesSet={handleDatesSet}
        eventContent={renderEventContent}
      />
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { getClientDisplayName } from '../lib/clients'
import { endOfWeek, startOfWeek } from '../lib/dates'

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

const defaultFilters = {
  status: 'all',
  cleanerId: '',
  clientId: '',
}

// simple helper
const isMobile = () =>
  typeof window !== 'undefined' && window.innerWidth < 768

export default function CalendarPage() {
  const [filters, setFilters] = useState(defaultFilters)
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [cleaners, setCleaners] = useState([])
  const [range, setRange] = useState(() => {
    const today = new Date()
    return {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
    }
  })

  // 👇 added: track which view to use (week on desktop, day on mobile)
  const [calendarView, setCalendarView] = useState(
    isMobile() ? 'timeGridDay' : 'timeGridWeek',
  )

  // clients
  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'))
    const unsub = onSnapshot(q, (snapshot) => setClients(mapSnapshot(snapshot)))
    return unsub
  }, [])

  // cleaners
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'cleaner'))
    const unsub = onSnapshot(q, (snapshot) => setCleaners(mapSnapshot(snapshot)))
    return unsub
  }, [])

  // jobs for current range + status
  useEffect(() => {
    const constraints = []
    if (range.start) constraints.push(where('date', '>=', range.start))
    if (range.end) constraints.push(where('date', '<=', range.end))
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }

    const q = query(collection(db, 'jobs'), ...constraints, orderBy('date', 'asc'))

    const unsub = onSnapshot(q, (snapshot) => setJobs(mapSnapshot(snapshot)), (err) =>
      console.error('Calendar jobs error:', err),
    )

    return unsub
  }, [range.start, range.end, filters.status])

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clientMap = useMemo(() => {
    const m = new Map()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const cleanerMap = useMemo(() => {
    const m = new Map()
    cleaners.forEach((u) => m.set(u.id, u))
    return m
  }, [cleaners])

  const events = useMemo(
    () =>
      jobs
        .filter((job) => {
          if (filters.cleanerId) {
            const assigned = job.assignedUserIds || []
            if (!assigned.includes(filters.cleanerId)) return false
          }
          if (filters.clientId) {
            const jobClientId = job.clientId || job.client_id
            if (jobClientId !== filters.clientId) return false
          }
          return true
        })
        .map((job) => {
          const clientId = job.clientId || job.client_id
          const client = clientMap.get(clientId)
          const clientName =
            job.clientName || job.client_name || getClientDisplayName(client) || 'Client'

          const start = job.date?.toDate ? job.date.toDate() : new Date(job.date)
          const end = new Date(start.getTime() + (job.durationMinutes || 60) * 60000)

          const assigned = (job.assignedUserIds || [])
            .map((id) => cleanerMap.get(id))
            .filter(Boolean)

          const cleanerLabel = assigned.length
            ? assigned.map((a) => a.displayName || a.email).join(', ')
            : 'Unassigned'

          return {
            id: job.id,
            title: clientName,
            start,
            end,
            extendedProps: {
              clientName,
              cleanerLabel,
              status: job.status || 'scheduled',
              durationMinutes: job.durationMinutes || 60,
            },
          }
        }),
    [jobs, clientMap, cleanerMap, filters.cleanerId, filters.clientId],
  )

  const handleDatesSet = (arg) => {
    setRange({
      start: arg.start,
      end: arg.end,
    })
  }

  // when window is resized, switch between week/day view automatically
  const handleWindowResize = (arg) => {
    const nextView = isMobile() ? 'timeGridDay' : 'timeGridWeek'
    if (nextView !== calendarView) {
      setCalendarView(nextView)
      arg.view.calendar.changeView(nextView)
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Calendar</h2>
        <p className="page-subtitle">
          Visual overview of all scheduled jobs. Filter by cleaner or client.
        </p>
      </header>

      <div className="panel calendar-filters">
        <div className="filters-grid">
          <label className="form-field">
            <span>Status</span>
            <select
              className="select"
              value={filters.status}
              onChange={handleFilterChange('status')}
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="form-field">
            <span>Cleaner</span>
            <select
              className="select"
              value={filters.cleanerId}
              onChange={handleFilterChange('cleanerId')}
            >
              <option value="">All cleaners</option>
              {cleaners.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.email}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Client</span>
            <select
              className="select"
              value={filters.clientId}
              onChange={handleFilterChange('clientId')}
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {getClientDisplayName(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel calendar-panel">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView={calendarView}
          headerToolbar={{
            left: 'prev,today,next',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          datesSet={handleDatesSet}
          windowResize={handleWindowResize}
          height="auto"
          eventContent={(arg) => {
            const { cleanerLabel, durationMinutes } = arg.event.extendedProps
            return (
              <div className="fc-event-inner">
                <div className="fc-event-title">{arg.event.title}</div>
                <div className="fc-event-meta">
                  <span>{cleanerLabel}</span>
                  <span>
                    {durationMinutes >= 60
                      ? `${durationMinutes / 60} hr${durationMinutes > 60 ? 's' : ''}`
                      : `${durationMinutes} min`}
                  </span>
                </div>
              </div>
            )
          }}
        />
      </div>
    </section>
  )
}

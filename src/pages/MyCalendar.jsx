// src/pages/MyCalendar.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import Toast from '../components/common/Toast'
import JobCalendar from '../components/calendar/JobCalendar'
import { subscribeToJobs } from '../services/jobs'
import { useAuth } from '../services/auth'

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

const makeInitialRange = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export default function MyCalendar() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [range, setRange] = useState(makeInitialRange)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // clients
  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'))
    const unsub = onSnapshot(q, (snapshot) => {
      setClients(mapSnapshot(snapshot))
    })
    return unsub
  }, [])

  // jobs in visible range
  useEffect(() => {
    if (!user) return
    setLoading(true)

    const unsub = subscribeToJobs(
      {
        start: range.start,
        end: range.end,
        status: 'all',
      },
      (snapshot) => {
        setJobs(mapSnapshot(snapshot))
        setLoading(false)
      },
    )

    return () => {
      unsub?.()
    }
  }, [range.start.getTime(), range.end.getTime(), user?.uid])

  const myJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const ids = job.assignedUserIds || []
        return ids.includes(user.uid)
      }),
    [jobs, user?.uid],
  )

  return (
    <section className="page">
      <header className="page-header">
        <h2>My calendar</h2>
        <p className="page-subtitle">
          See your scheduled cleanings in a calendar view.
        </p>
      </header>

      <Toast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />

      {loading && <p>Loading your jobs…</p>}

      <JobCalendar
        jobs={myJobs}
        clients={clients}
        users={[]}      // cleaners not needed on cleaner view
        mode="cleaner"
        onRangeChange={setRange}
      />
    </section>
  )
}

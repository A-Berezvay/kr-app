import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import Toast from '../components/common/Toast'
import JobFilters from '../components/jobs/JobFilters'
import JobList from '../components/jobs/JobList'
import StatCards from '../components/jobs/StatCards'
import JobModal from '../components/jobs/JobModal'
import AssignDialog from '../components/jobs/AssignDialog'
import { endOfToday, getRollingWeekRange, startOfToday } from '../lib/dates'
import {
  assignCleaners,
  createJob,
  deleteJob,
  markJobCompleted,
  markJobStarted,
  subscribeToJobs,
  updateJob,
} from '../services/jobs'

const defaultFilters = {
  range: 'today',
  status: 'all',
  clientId: '',
  cleanerIds: [],
}

const mapSnapshot = (snapshot) =>
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

export default function Jobs() {
  const [filters, setFilters] = useState(defaultFilters)
  const [clients, setClients] = useState([])
  const [cleaners, setCleaners] = useState([])
  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [assignJobTarget, setAssignJobTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [actionJobId, setActionJobId] = useState(null)
  const [weekJobs, setWeekJobs] = useState([])

  // --- data subscriptions ---

  useEffect(() => {
    const clientsQuery = query(collection(db, 'clients'), orderBy('name', 'asc'))
    const unsub = onSnapshot(clientsQuery, (snapshot) => {
      setClients(mapSnapshot(snapshot))
    })
    return unsub
  }, [])

  useEffect(() => {
    const cleanersQuery = query(collection(db, 'users'), where('role', '==', 'cleaner'))
    const unsub = onSnapshot(cleanersQuery, (snapshot) => {
      setCleaners(mapSnapshot(snapshot))
    })
    return unsub
  }, [])

  useEffect(() => {
    const { start, end } = getRollingWeekRange()
    const unsub = subscribeToJobs(
      {
        start,
        end,
        status: 'all',
      },
      (snapshot) => setWeekJobs(mapSnapshot(snapshot)),
    )
    return () => {
      unsub?.()
    }
  }, [])

  // --- derived data ---

  const stats = useMemo(() => {
    const todayStart = startOfToday()
    const todayEnd = endOfToday()
    let todayScheduled = 0
    let weekScheduled = 0
    let completedThisWeek = 0

    weekJobs.forEach((job) => {
      const jobDate = job.date?.toDate ? job.date.toDate() : new Date(job.date)
      const status = job.status || 'scheduled'
      if (status === 'scheduled') {
        weekScheduled += 1
        if (jobDate >= todayStart && jobDate <= todayEnd) {
          todayScheduled += 1
        }
      }
      if (status === 'completed') {
        completedThisWeek += 1
      }
    })

    return { todayScheduled, weekScheduled, completedThisWeek }
  }, [weekJobs])

  // Only show active/prospect clients when filtering & assigning
  const assignableClients = useMemo(
    () =>
      clients.filter((c) => {
        const status = (c.status || 'active').toLowerCase()
        return status !== 'inactive' && status !== 'lost'
      }),
    [clients],
  )

  // --- handlers ---

  const handleCreateClick = () => {
    setEditingJob(null)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingJob(null)
  }

  const handleAssignClose = () => {
    setAssignOpen(false)
    setAssignJobTarget(null)
  }

  const handleSaveJob = async (payload) => {
    setSaving(true)
    try {
      if (editingJob) {
        await updateJob(editingJob.id, payload)
        setToast({ type: 'success', message: 'Job updated successfully.' })
      } else {
        await createJob(payload)
        setToast({ type: 'success', message: 'Job created successfully.' })
      }
      setModalOpen(false)
      setEditingJob(null)
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to save job.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignSave = async (userIds) => {
    if (!assignJobTarget) return
    setAssignSaving(true)
    try {
      await assignCleaners(assignJobTarget.id, userIds)
      setToast({ type: 'success', message: 'Assignment updated.' })
      handleAssignClose()
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to update assignment.' })
    } finally {
      setAssignSaving(false)
    }
  }

  const handleDelete = async (job) => {
    if (!window.confirm('Delete this job?')) return
    try {
      await deleteJob(job.id)
      setToast({ type: 'success', message: 'Job deleted.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to delete job.' })
    }
  }

  const handleStart = async (job) => {
    setActionJobId(job.id)
    try {
      await markJobStarted(job.id)
      setToast({ type: 'success', message: 'Job started.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to mark job as started.' })
    } finally {
      setActionJobId(null)
    }
  }

  const handleComplete = async (job) => {
    setActionJobId(job.id)
    try {
      await markJobCompleted(job.id)
      setToast({ type: 'success', message: 'Job completed.' })
    } catch (error) {
      console.error(error)
      setToast({ type: 'error', message: 'Failed to complete job.' })
    } finally {
      setActionJobId(null)
    }
  }

  // --- render ---

  return (
    <section className="page">
      <header className="page-header">
        <h2>Operations schedule</h2>
        <p className="page-subtitle">
          View upcoming jobs, assign cleaners, and track completion in real time.
        </p>
      </header>

      <Toast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />

      <StatCards stats={stats} />

      <JobFilters
        filters={filters}
        cleaners={cleaners}
        clients={assignableClients}    // only active / prospect in filters
        onChange={setFilters}
        onCreate={handleCreateClick}
      />

      <JobList
        filters={filters}
        clients={clients}              // keep ALL so old jobs still show
        cleaners={cleaners}
        onAssign={(job) => {
          setAssignJobTarget(job)
          setAssignOpen(true)
        }}
        onEdit={(job) => {
          setEditingJob(job)
          setModalOpen(true)
        }}
        onDelete={handleDelete}
        onStart={handleStart}
        onComplete={handleComplete}
        actionJobId={actionJobId}
      />

      <JobModal
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSaveJob}
        clients={assignableClients}    // only active / prospect when creating/editing
        cleaners={cleaners}
        initialJob={editingJob}
        saving={saving}
      />

      <AssignDialog
        open={assignOpen}
        onClose={handleAssignClose}
        job={assignJobTarget}
        cleaners={cleaners}
        onSave={handleAssignSave}
        saving={assignSaving}
      />
    </section>
  )
}

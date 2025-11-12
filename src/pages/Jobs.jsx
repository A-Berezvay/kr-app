import React, { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Jobs(){
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({
    title: '',
    department: 'Operations',
    location: 'Remote',
    status: 'open',
    type: 'Full-time',
  })

  useEffect(()=>{
    const col = collection(db, 'jobs')
    const unsub = onSnapshot(col, snap => {
      setJobs(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!form.title.trim()) return
    await addDoc(collection(db,'jobs'), {
      ...form,
      createdAt: serverTimestamp(),
    })
    setForm({ title: '', department: 'Operations', location: 'Remote', status: 'open', type: 'Full-time' })
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'jobs', id))
  }

  const toggleStatus = async (job) => {
    const ref = doc(db, 'jobs', job.id)
    const next = (job.status || 'open') === 'open' ? 'closed' : 'open'
    await updateDoc(ref, { status: next })
  }

  const stats = useMemo(() => {
    const total = jobs.length
    const open = jobs.filter(j => (j.status || 'open') === 'open').length
    const remote = jobs.filter(j => (j.location || '').toLowerCase().includes('remote')).length
    return { total, open, remote }
  }, [jobs])

  const updateField = (field) => (e) => {
    setForm(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const formatDate = (job) => {
    if (!job.createdAt) return 'Just now'
    const date = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Jobs</h2>
        <p className="page-subtitle">Manage job postings and opportunities in one place.</p>
      </header>
      <section className="stats-grid" aria-label="Job overview">
        <article className="stat-card">
          <span className="stat-label">Published roles</span>
          <span className="stat-value">{stats.total}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Open positions</span>
          <span className="stat-value">{stats.open}</span>
          <span className="stat-caption">Accepting new applicants</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Remote friendly</span>
          <span className="stat-value">{stats.remote}</span>
          <span className="stat-caption">Listing "remote" in location</span>
        </article>
      </section>
      <form onSubmit={add} className="panel form-grid" aria-label="Add job">
        <label className="form-field">
          <span>Job title</span>
          <input
            className="input"
            value={form.title}
            onChange={updateField('title')}
            placeholder="Senior Project Manager"
            required
          />
        </label>
        <label className="form-field">
          <span>Department</span>
          <input
            className="input"
            value={form.department}
            onChange={updateField('department')}
            placeholder="Operations"
          />
        </label>
        <label className="form-field">
          <span>Location</span>
          <input
            className="input"
            value={form.location}
            onChange={updateField('location')}
            placeholder="Remote / Austin, TX"
          />
        </label>
        <label className="form-field">
          <span>Employment type</span>
          <select className="select" value={form.type} onChange={updateField('type')}>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Freelance</option>
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select className="select" value={form.status} onChange={updateField('status')}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Add job</button>
        </div>
      </form>
      <ul className="item-list">
        {jobs.map(j => (
          <li key={j.id} className="item">
            <div className="item-main">
              <div>
                <span className="item-title">{j.title}</span>
                <div className="item-meta">Posted {formatDate(j)}</div>
              </div>
              <div className="item-tags">
                <span className="badge badge-muted">{j.department || 'Operations'}</span>
                <span className="badge badge-soft">{j.type || 'Full-time'}</span>
                <span className={`badge ${((j.status || 'open') === 'open' ? 'badge-success' : 'badge-muted')}`}>{(j.status || 'open').replace(/^\w/, s => s.toUpperCase())}</span>
              </div>
            </div>
            <div className="item-detail">
              <span className="item-label">Location</span>
              <span>{j.location || '—'}</span>
            </div>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>toggleStatus(j)}>
                {(j.status || 'open') === 'open' ? 'Close role' : 'Reopen'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={()=>remove(j.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

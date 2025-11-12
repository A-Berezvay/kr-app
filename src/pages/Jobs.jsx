import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Jobs(){
  const [jobs, setJobs] = useState([])
  const [title, setTitle] = useState('')

  useEffect(()=>{
    const col = collection(db, 'jobs')
    const unsub = onSnapshot(col, snap => {
      setJobs(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!title) return
    await addDoc(collection(db,'jobs'), { title, createdAt: new Date() })
    setTitle('')
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'jobs', id))
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Jobs</h2>
        <p className="page-subtitle">Manage job postings and opportunities in one place.</p>
      </header>
      <form onSubmit={add} className="panel form-inline">
        <input
          className="input"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          placeholder="Job title"
        />
        <button type="submit" className="btn btn-primary">Add job</button>
      </form>
      <ul className="item-list">
        {jobs.map(j => (
          <li key={j.id} className="item">
            <span className="item-title">{j.title}</span>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>remove(j.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

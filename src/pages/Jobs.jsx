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
    <div style={{padding:16}}>
      <h2>Jobs</h2>
      <form onSubmit={add} style={{display:'flex', gap:8}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Job title" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {jobs.map(j => (
          <li key={j.id} style={{display:'flex', gap:8, alignItems:'center'}}>
            <span>{j.title}</span>
            <button onClick={()=>remove(j.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Clients(){
  const [clients, setClients] = useState([])
  const [name, setName] = useState('')

  useEffect(()=>{
    const col = collection(db, 'clients')
    const unsub = onSnapshot(col, snap => {
      setClients(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!name) return
    await addDoc(collection(db,'clients'), { name, createdAt: new Date() })
    setName('')
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'clients', id))
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Clients</h2>
        <p className="page-subtitle">Keep track of every client your team works with.</p>
      </header>
      <form onSubmit={add} className="panel form-inline">
        <input
          className="input"
          value={name}
          onChange={e=>setName(e.target.value)}
          placeholder="Client name"
        />
        <button type="submit" className="btn btn-primary">Add client</button>
      </form>
      <ul className="item-list">
        {clients.map(c => (
          <li key={c.id} className="item">
            <span className="item-title">{c.name}</span>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>remove(c.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

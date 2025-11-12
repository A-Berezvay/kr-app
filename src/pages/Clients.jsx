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
    <div style={{padding:16}}>
      <h2>Clients</h2>
      <form onSubmit={add} style={{display:'flex', gap:8}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Client name" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {clients.map(c => (
          <li key={c.id} style={{display:'flex', gap:8, alignItems:'center'}}>
            <span>{c.name}</span>
            <button onClick={()=>remove(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Users(){
  const [users, setUsers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')

  useEffect(()=>{
    const col = collection(db, 'users')
    const unsub = onSnapshot(col, snap => {
      setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})))
    })
    return unsub
  },[])

  const add = async (e) => {
    e.preventDefault()
    if(!email) return
    await addDoc(collection(db,'users'), { email, role, createdAt: new Date() })
    setEmail('')
  }

  const remove = async (id) => {
    await deleteDoc(doc(db,'users', id))
  }

  const toggleRole = async (u) => {
    const ref = doc(db,'users', u.id)
    await updateDoc(ref, { role: u.role === 'admin' ? 'user' : 'admin' })
  }

  return (
    <div style={{padding:16}}>
      <h2>Users (Firestore collection)</h2>
      <form onSubmit={add} style={{display:'flex', gap:8}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit">Add</button>
      </form>
      <ul>
        {users.map(u => (
          <li key={u.id} style={{display:'flex', gap:8, alignItems:'center'}}>
            <span>{u.email} — {u.role}</span>
            <button onClick={()=>toggleRole(u)}>Toggle role</button>
            <button onClick={()=>remove(u.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

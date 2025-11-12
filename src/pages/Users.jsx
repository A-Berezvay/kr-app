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
    <section className="page">
      <header className="page-header">
        <h2>Users</h2>
        <p className="page-subtitle">Invite teammates and manage their permissions.</p>
      </header>
      <form onSubmit={add} className="panel form-inline">
        <input
          className="input"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="email"
        />
        <select
          className="select"
          value={role}
          onChange={e=>setRole(e.target.value)}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="btn btn-primary">Add user</button>
      </form>
      <ul className="item-list">
        {users.map(u => (
          <li key={u.id} className="item">
            <span className="item-title">{u.email}</span>
            <span className="item-meta">Role: {u.role}</span>
            <div className="item-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>toggleRole(u)}>
                Toggle role
              </button>
              <button type="button" className="btn btn-ghost" onClick={()=>remove(u.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

const jobsCollection = collection(db, 'jobs')

export const createJob = async (data) => {
  return addDoc(jobsCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateJob = async (id, data) => {
  const ref = doc(db, 'jobs', id)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deleteJob = async (id) => {
  const ref = doc(db, 'jobs', id)
  await deleteDoc(ref)
}

export const assignCleaners = async (jobId, userIds) => {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    assignedUserIds: userIds,
    updatedAt: serverTimestamp(),
  })
}

export const markStatus = async (jobId, status) => {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  })
}

export const markJobStarted = async (jobId) => markStatus(jobId, 'in_progress')

export const markJobCompleted = async (jobId) => markStatus(jobId, 'completed')

const toTimestamp = (date) => (date instanceof Timestamp ? date : Timestamp.fromDate(date))

export const subscribeToJobs = (
  { start, end, status, clientId, cleanerIds },
  onNext,
  onError,
) => {
  const constraints = [orderBy('date', 'asc')]
  if (start) {
    constraints.push(where('date', '>=', toTimestamp(start)))
  }
  if (end) {
    constraints.push(where('date', '<', toTimestamp(end)))
  }
  if (status && status !== 'all') {
    constraints.push(where('status', '==', status))
  }
  if (clientId) {
    constraints.push(where('clientId', '==', clientId))
  }
  if (Array.isArray(cleanerIds) && cleanerIds.length) {
    constraints.push(where('assignedUserIds', 'array-contains-any', cleanerIds))
  }

  const q = query(jobsCollection, ...constraints)
  return onSnapshot(q, onNext, onError)
}

export const subscribeToCleanerJobs = ({ uid, start, end }, onNext, onError) => {
  if (!uid) return () => {}
  const constraints = [
    where('assignedUserIds', 'array-contains', uid),
    orderBy('date', 'asc'),
  ]
  if (start) constraints.push(where('date', '>=', toTimestamp(start)))
  if (end) constraints.push(where('date', '<', toTimestamp(end)))
  const q = query(jobsCollection, ...constraints)
  return onSnapshot(q, onNext, onError)
}

export const addCleanerToJob = async (jobId, uid) => {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    assignedUserIds: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  })
}

export const removeCleanerFromJob = async (jobId, uid) => {
  const ref = doc(db, 'jobs', jobId)
  await updateDoc(ref, {
    assignedUserIds: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  })
}

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  limit,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { startOfDay } from '../lib/dates'

// IMPORTANT: use lowercase to match Firestore: 'worklogs'
const workLogsCollection = collection(db, 'worklogs')

// ---------- helpers ----------

const ensureDate = (value: any): Date => {
  if (!value) return new Date()
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return new Date(value)
}

const toTimestamp = (value: any) => {
  if (!value) return null
  if (value instanceof Timestamp) return value
  return Timestamp.fromDate(ensureDate(value))
}

// ---------- core creators ----------

/**
 * Creates a brand new work log entry when a cleaner presses "Start".
 * Called from MyJobs via recordWorkLogStart.
 */
export const recordWorkLogStart = async ({
  jobId,
  jobDate,
  clientId,
  clientName,
  userId,
  userName,
  userEmail,
}: {
  jobId?: string
  jobDate?: any
  clientId?: string
  clientName?: string
  userId: string
  userName?: string | null
  userEmail?: string | null
}) => {
  if (!userId) throw new Error('A userId is required to log work.')

  const now = serverTimestamp()
  const normalizedWorkDate = startOfDay(ensureDate(jobDate || new Date()))

  const docRef = await addDoc(workLogsCollection, {
    userId,
    userName: userName || null,
    userEmail: userEmail || null,

    jobId: jobId || null,
    clientId: clientId || null,
    clientName: clientName || null,

    workDate: Timestamp.fromDate(normalizedWorkDate),
    startTime: now,
    endTime: null,
    durationMinutes: null,
    notes: '',

    createdAt: now,
    updatedAt: now,
  })

  return docRef
}

/**
 * When a cleaner presses "Complete", we look for the open log
 * (same user + job + no endTime) and close it.
 * If none exists, we create a new "one-shot" entry.
 */
export const recordWorkLogCompletion = async ({
  jobId,
  jobDate,
  clientId,
  clientName,
  userId,
  userName,
  userEmail,
}: {
  jobId?: string
  jobDate?: any
  clientId?: string
  clientName?: string
  userId: string
  userName?: string | null
  userEmail?: string | null
}) => {
  if (!userId) throw new Error('A userId is required to log work.')

  const now = serverTimestamp()
  const normalizedWorkDate = startOfDay(ensureDate(jobDate || new Date()))

  // Try to find an existing open entry
  const openQuery = query(
    workLogsCollection,
    where('userId', '==', userId),
    where('jobId', '==', jobId || null),
    where('endTime', '==', null),
    limit(1),
  )

  const snapshot = await getDocs(openQuery)

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0]
    const ref = doc(db, 'worklogs', docSnap.id)

    await updateDoc(ref, {
      endTime: now,
      updatedAt: now,
    })

    return ref
  }

  // Fallback: create a new fully-closed entry
  const docRef = await addDoc(workLogsCollection, {
    userId,
    userName: userName || null,
    userEmail: userEmail || null,

    jobId: jobId || null,
    clientId: clientId || null,
    clientName: clientName || null,

    workDate: Timestamp.fromDate(normalizedWorkDate),
    startTime: now,
    endTime: now,
    durationMinutes: null,
    notes: '',

    createdAt: now,
    updatedAt: now,
  })

  return docRef
}

// ---------- update & deletion ----------

/**
 * Admin edit of a work log entry (times + notes).
 * Accepts plain JS Dates/numbers/strings and converts to Timestamps as needed.
 */
export const updateWorkLogEntry = async (
  id: string,
  updates: {
    workDate?: any
    startTime?: any
    endTime?: any
    durationMinutes?: number | null
    notes?: string
  },
) => {
  const ref = doc(db, 'worklogs', id)

  const payload: any = {}

  if (updates.workDate) payload.workDate = toTimestamp(updates.workDate)
  if (updates.startTime) payload.startTime = toTimestamp(updates.startTime)
  if (updates.endTime) payload.endTime = toTimestamp(updates.endTime)
  if (typeof updates.durationMinutes === 'number' || updates.durationMinutes === null) {
    payload.durationMinutes = updates.durationMinutes
  }
  if (typeof updates.notes !== 'undefined') {
    payload.notes = updates.notes
  }

  payload.updatedAt = serverTimestamp()

  await updateDoc(ref, payload)
}

/**
 * Subscribe to logs in a date range.
 * Options: { start: Date/Timestamp, end: Date/Timestamp, userId?: string }
 * Used by the WorkLog page.
 */
export const subscribeToWorkLogs = (
  options: { start?: any; end?: any; userId?: string | null },
  onNext: any,
  onError: any,
) => {
  const { start, end, userId } = options || {}
  const constraints: any[] = []

  if (start) constraints.push(where('workDate', '>=', toTimestamp(start)))
  if (end) constraints.push(where('workDate', '<=', toTimestamp(end)))
  if (userId) constraints.push(where('userId', '==', userId))

  constraints.push(orderBy('workDate', 'asc'))

  const q = query(workLogsCollection, ...constraints)

  return onSnapshot(q, onNext, onError)
}

/**
 * Admin-only helper to create a manual work log entry.
 * Used from the Work Log page "Add work log" modal.
 */
export const createManualWorkLog = async ({
  userId,
  userName,
  userEmail,
  clientId,
  clientName,
  workDate, // Date object
  startTime, // Date object
  endTime, // Date object
  notes = '',
}: {
  userId: string
  userName?: string | null
  userEmail?: string | null
  clientId?: string | null
  clientName?: string | null
  workDate: any
  startTime: any
  endTime: any
  notes?: string
}) => {
  if (!userId) throw new Error('userId is required')

  const start = ensureDate(startTime || workDate || new Date())
  const end = ensureDate(endTime || start)
  const workDay = startOfDay(ensureDate(workDate || start))

  const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 0)

  const now = serverTimestamp()

  return addDoc(workLogsCollection, {
    userId,
    userName: userName || null,
    userEmail: userEmail || null,

    jobId: null, // manual entry has no job
    clientId: clientId || null,
    clientName: clientName || null,

    workDate: Timestamp.fromDate(workDay),
    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(end),
    durationMinutes,
    notes,

    createdAt: now,
    updatedAt: now,
  })
}

export const deleteWorkLogEntry = async (id: string) => {
  const ref = doc(db, 'worklogs', id)
  await deleteDoc(ref)
}


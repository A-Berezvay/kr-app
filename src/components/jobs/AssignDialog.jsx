import React, { useEffect, useMemo, useState } from 'react'

export default function AssignDialog({ open, onClose, job, cleaners, onSave, saving }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(job?.assignedUserIds || [])

  useEffect(() => {
    if (open) {
      setSelected(job?.assignedUserIds || [])
      setSearch('')
    }
  }, [open, job])

  const activeCleaners = useMemo(
    () => cleaners.filter((cleaner) => cleaner.active !== false),
    [cleaners],
  )

  const filteredCleaners = useMemo(() => {
    const lower = search.trim().toLowerCase()
    if (!lower) return activeCleaners
    return activeCleaners.filter((cleaner) => {
      const value = `${cleaner.displayName || ''} ${cleaner.email || ''}`.toLowerCase()
      return value.includes(lower)
    })
  }, [activeCleaners, search])

  const toggleCleaner = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((cleanerId) => cleanerId !== id) : [...prev, id],
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(selected)
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h3>Assign cleaners</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          <input
            className="input"
            placeholder="Search cleaners"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="option-list">
            {filteredCleaners.length === 0 && (
              <p className="empty-state">No cleaners match your search.</p>
            )}
            {filteredCleaners.map((cleaner) => (
              <label key={cleaner.id} className="option-item">
                <input
                  type="checkbox"
                  checked={selected.includes(cleaner.id)}
                  onChange={() => toggleCleaner(cleaner.id)}
                />
                <div>
                  <span className="option-title">{cleaner.displayName || cleaner.email}</span>
                  {cleaner.email && cleaner.displayName && (
                    <span className="option-subtitle">{cleaner.email}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save' }
          </button>
        </footer>
      </form>
    </div>
  )
}

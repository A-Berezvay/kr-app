import React from 'react'
import { getClientDisplayName } from '../../lib/clients'

const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function JobFilters({ filters, cleaners, clients, onChange, onCreate }) {
  const handleRangeChange = (range) => {
    if (filters.range === range) return
    onChange({ ...filters, range })
  }

  const handleStatusChange = (event) => {
    onChange({ ...filters, status: event.target.value })
  }

  const handleClientChange = (event) => {
    onChange({ ...filters, clientId: event.target.value })
  }

  const handleCleanerChange = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    onChange({ ...filters, cleanerIds: values })
  }

  const resetFilters = () => {
    onChange({ ...filters, status: 'all', clientId: '', cleanerIds: [] })
  }

  const activeCleaners = cleaners.filter((cleaner) => cleaner.active !== false)

  return (
    <div className="panel job-filters" aria-label="Job filters">
      <div className="filters-row">
        <div className="filter-group">
          <span className="filter-label">Date range</span>
          <div className="filter-toggle-group">
            <button
              type="button"
              className={`btn btn-secondary ${filters.range === 'today' ? 'is-active' : ''}`}
              onClick={() => handleRangeChange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn btn-secondary ${filters.range === 'week' ? 'is-active' : ''}`}
              onClick={() => handleRangeChange('week')}
            >
              This week
            </button>
          </div>
        </div>
        <div className="filter-spacer" />
        <div className="filter-actions">
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>
            Reset filters
          </button>
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            Create job
          </button>
        </div>
      </div>
      <div className="filters-grid">
        <label className="form-field">
          <span>Status</span>
          <select className="select" value={filters.status} onChange={handleStatusChange}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Cleaner</span>
          <select
            multiple
            className="select"
            value={filters.cleanerIds}
            onChange={handleCleanerChange}
          >
            {activeCleaners.map((cleaner) => (
              <option key={cleaner.id} value={cleaner.id}>
                {cleaner.displayName || cleaner.email}
              </option>
            ))}
          </select>
          <span className="helper-text">Hold Ctrl (Cmd on Mac) to select multiple cleaners.</span>
        </label>
        <label className="form-field">
          <span>Client</span>
          <select className="select" value={filters.clientId} onChange={handleClientChange}>
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {getClientDisplayName(client)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

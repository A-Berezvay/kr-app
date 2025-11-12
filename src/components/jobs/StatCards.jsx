import React from 'react'

const formatNumber = (value) => new Intl.NumberFormat().format(value || 0)

export default function StatCards({ stats }) {
  const { todayScheduled = 0, weekScheduled = 0, completedThisWeek = 0 } = stats || {}

  return (
    <section className="stats-grid" aria-label="Job statistics">
      <article className="stat-card">
        <span className="stat-label">Today scheduled</span>
        <span className="stat-value">{formatNumber(todayScheduled)}</span>
      </article>
      <article className="stat-card">
        <span className="stat-label">This week scheduled</span>
        <span className="stat-value">{formatNumber(weekScheduled)}</span>
      </article>
      <article className="stat-card">
        <span className="stat-label">Completed this week</span>
        <span className="stat-value">{formatNumber(completedThisWeek)}</span>
      </article>
    </section>
  )
}

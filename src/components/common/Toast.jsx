import React, { useEffect } from 'react'

export default function Toast({ message, type = 'success', onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className={`toast toast-${type}`} role="status">
      <span>{message}</span>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}

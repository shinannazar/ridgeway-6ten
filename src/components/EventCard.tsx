'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Alert = {
  id: string
  type: string
  zone: string
  timestamp: string
  severity: string
  description: string
  status: string
}

type Props = {
  alert: Alert
  isSelected: boolean
  onClick: () => void
  onStatusChange: (id: string, status: string) => void
}

const severityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high: { color: 'text-red-400', bg: 'bg-red-950', border: 'border-red-800', label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-950', border: 'border-yellow-800', label: 'Medium' },
  low: { color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', label: 'Low' },
}

const typeLabels: Record<string, string> = {
  fence_alert: 'Fence Alert',
  vehicle_intrusion: 'Vehicle',
  perimeter_breach: 'Perimeter',
  equipment_anomaly: 'Equipment',
}

const statusConfig: Record<string, { color: string; label: string }> = {
  unreviewed: { color: 'text-slate-500', label: 'Unreviewed' },
  approved: { color: 'text-green-400', label: '✓ Cleared' },
  escalated: { color: 'text-red-400', label: '🚨 Escalated' },
  dismissed: { color: 'text-slate-500', label: '✕ Dismissed' },
  needs_followup: { color: 'text-orange-400', label: '⚑ Follow-up' },
}

export default function EventCard({ alert, isSelected, onClick, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(alert.status)
  const supabase = createClient()

  const sev = severityConfig[alert.severity] ?? severityConfig.low
  const time = new Date(alert.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    await supabase
      .from('alerts')
      .update({ status: newStatus })
      .eq('id', alert.id)
    setCurrentStatus(newStatus)
    onStatusChange(alert.id, newStatus)
    setLoading(false)
  }

  return (
    <div
      className={`rounded-lg p-3 cursor-pointer transition-all border ${
        isSelected
          ? `${sev.bg} ${sev.border}`
          : 'bg-slate-800 border-slate-700 hover:border-slate-500'
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-mono uppercase tracking-wide ${sev.color}`}>
          {typeLabels[alert.type] ?? alert.type}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded border ${sev.color} ${sev.bg} ${sev.border}`}>
          {sev.label}
        </span>
      </div>

      {/* Zone + Time */}
      <p className="text-slate-200 text-sm font-medium">{alert.zone}</p>
      <p className="text-slate-400 text-xs mt-0.5">{time}</p>

      {/* Status */}
      <p className={`text-xs mt-1 ${statusConfig[currentStatus]?.color ?? 'text-slate-500'}`}>
        {statusConfig[currentStatus]?.label ?? currentStatus}
      </p>

      {/* Action Buttons - show when selected */}
      {isSelected && (
        <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
          <button
            disabled={loading}
            onClick={() => updateStatus('approved')}
            className="flex-1 bg-green-900 hover:bg-green-800 border border-green-700 text-green-300 text-xs py-1.5 rounded transition-colors"
          >
            ✓ Clear
          </button>
          <button
            disabled={loading}
            onClick={() => updateStatus('escalated')}
            className="flex-1 bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 text-xs py-1.5 rounded transition-colors"
          >
            🚨 Escalate
          </button>
          <button
            disabled={loading}
            onClick={() => updateStatus('dismissed')}
            className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs py-1.5 rounded transition-colors"
          >
            ✕ Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
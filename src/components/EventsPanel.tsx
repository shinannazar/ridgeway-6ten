'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard from './EventCard'

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
  onAlertSelect: (alert: Alert | null) => void
  selectedAlertId?: string | null
}

export default function EventsPanel({ onAlertSelect, selectedAlertId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: true })
    if (data) setAlerts(data)
    setLoading(false)
  }

  const handleStatusChange = (id: string, status: string) => {
    setAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    )
  }

  const reviewed = alerts.filter(a => a.status !== 'unreviewed').length
  const total = alerts.length

  return (
    <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-200 font-semibold text-sm">Overnight Events</h2>
            <p className="text-slate-500 text-xs mt-1">Jan 15, 2024 · 22:00 – 06:00</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">{reviewed}/{total} reviewed</p>
            <div className="w-16 h-1 bg-slate-700 rounded mt-1">
              <div
                className="h-1 bg-blue-500 rounded transition-all"
                style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-slate-500 text-xs text-center mt-8">Loading events...</div>
        ) : (
          alerts.map(alert => (
            <EventCard
              key={alert.id}
              alert={alert}
              isSelected={selectedAlertId === alert.id}
              onClick={() => onAlertSelect(
                selectedAlertId === alert.id ? null : alert
              )}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {/* Badge Events Section */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-orange-400 text-xs font-mono uppercase tracking-wide">Badge Events</span>
            <span className="bg-orange-950 text-orange-400 border border-orange-800 text-xs px-2 py-0.5 rounded">3 Failed</span>
          </div>
          <p className="text-slate-200 text-sm font-medium">Access Point Delta</p>
          <p className="text-slate-400 text-xs mt-1">02:47 – 03:08 AM · EMP-0334</p>
        </div>

        {/* Raghav's Note */}
        <div className="bg-amber-950 border border-amber-800 rounded-lg p-3">
          <p className="text-amber-400 text-xs font-mono uppercase tracking-wide mb-1">📝 Raghav's Note</p>
          <p className="text-amber-200 text-xs italic">"Please check Block C before leadership asks."</p>
        </div>
      </div>
    </div>
  )
}
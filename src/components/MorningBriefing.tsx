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
  agentSummary: string
}

const typeLabels: Record<string, string> = {
  fence_alert: 'Fence Alert',
  vehicle_intrusion: 'Vehicle Intrusion',
  perimeter_breach: 'Perimeter Breach',
  equipment_anomaly: 'Equipment Anomaly',
}

export default function MorningBriefing({ agentSummary }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  const generateBriefing = async () => {
    setLoading(true)
    setIsOpen(true)
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: true })
    if (data) setAlerts(data)
    setLoading(false)
  }

  const escalated = alerts.filter(a => a.status === 'escalated')
  const cleared = alerts.filter(a => a.status === 'approved')
  const needsFollowup = alerts.filter(a => a.status === 'needs_followup')
  const unreviewed = alerts.filter(a => a.status === 'unreviewed')

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  const handlePrint = () => window.print()

  const handleCopy = () => {
    const text = document.getElementById('briefing-content')?.innerText ?? ''
    navigator.clipboard.writeText(text)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-white font-bold text-lg">Morning Briefing</h2>
            <p className="text-slate-400 text-xs mt-0.5">Prepared for Nisha · Site Head · 08:00 AM</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-200 text-xs border border-slate-700 rounded px-3 py-1.5 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={handlePrint}
              className="text-slate-400 hover:text-slate-200 text-xs border border-slate-700 rounded px-3 py-1.5 transition-colors"
            >
              Print
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Generating briefing...</div>
        ) : (
          <div id="briefing-content" className="p-5 space-y-5">

            {/* Header Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Date</p>
                  <p className="text-white text-sm font-medium">Jan 15, 2024</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Patrol Period</p>
                  <p className="text-white text-sm font-medium">22:00 – 06:00</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Prepared By</p>
                  <p className="text-white text-sm font-medium">Maya · Ops Lead</p>
                </div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-center">
                <p className="text-red-400 text-2xl font-bold">{escalated.length}</p>
                <p className="text-red-300 text-xs mt-1">Escalated</p>
              </div>
              <div className="bg-green-950 border border-green-800 rounded-lg p-3 text-center">
                <p className="text-green-400 text-2xl font-bold">{cleared.length}</p>
                <p className="text-green-300 text-xs mt-1">Cleared</p>
              </div>
              <div className="bg-orange-950 border border-orange-800 rounded-lg p-3 text-center">
                <p className="text-orange-400 text-2xl font-bold">{needsFollowup.length}</p>
                <p className="text-orange-300 text-xs mt-1">Follow-up</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-2xl font-bold">{unreviewed.length}</p>
                <p className="text-slate-400 text-xs mt-1">Unreviewed</p>
              </div>
            </div>

            {/* Escalated Items */}
            {escalated.length > 0 && (
              <div>
                <h3 className="text-red-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  🚨 Requires Immediate Attention
                </h3>
                <div className="space-y-2">
                  {escalated.map(a => (
                    <div key={a.id} className="bg-red-950 border border-red-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{typeLabels[a.type] ?? a.type}</p>
                        <p className="text-red-300 text-xs">{formatTime(a.timestamp)}</p>
                      </div>
                      <p className="text-red-200 text-xs mt-1">{a.zone}</p>
                      <p className="text-slate-300 text-xs mt-1">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Items */}
            {needsFollowup.length > 0 && (
              <div>
                <h3 className="text-orange-400 text-sm font-semibold mb-2">⚑ Needs Follow-up</h3>
                <div className="space-y-2">
                  {needsFollowup.map(a => (
                    <div key={a.id} className="bg-orange-950 border border-orange-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{typeLabels[a.type] ?? a.type}</p>
                        <p className="text-orange-300 text-xs">{formatTime(a.timestamp)}</p>
                      </div>
                      <p className="text-orange-200 text-xs mt-1">{a.zone}</p>
                      <p className="text-slate-300 text-xs mt-1">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cleared Items */}
            {cleared.length > 0 && (
              <div>
                <h3 className="text-green-400 text-sm font-semibold mb-2">✓ Cleared / No Action Required</h3>
                <div className="space-y-2">
                  {cleared.map(a => (
                    <div key={a.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{typeLabels[a.type] ?? a.type}</p>
                        <p className="text-slate-400 text-xs">{formatTime(a.timestamp)}</p>
                      </div>
                      <p className="text-slate-300 text-xs mt-1">{a.zone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {agentSummary && (
              <div>
                <h3 className="text-blue-400 text-sm font-semibold mb-2">🤖 AI Investigation Summary</h3>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {agentSummary.slice(0, 800)}{agentSummary.length > 800 ? '...' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Drone Patrol */}
            <div>
              <h3 className="text-blue-400 text-sm font-semibold mb-2">🚁 Drone Patrol Summary</h3>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Patrol ID</span>
                  <span className="text-slate-200">PATROL-NIGHT-04</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Time</span>
                  <span className="text-slate-200">04:15 AM – 04:58 AM</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Waypoints</span>
                  <span className="text-slate-200">7 completed</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Key Finding</span>
                  <span className="text-slate-200">Tire tracks at C-7, padlock intact</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700 pt-4 text-center">
              <p className="text-slate-500 text-xs">
                Ridgeway Site · 6:10 Assistant · Generated {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
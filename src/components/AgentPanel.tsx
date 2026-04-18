'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import MorningBriefing from './MorningBriefing'

const toolLabels: Record<string, string> = {
  get_alerts: '🔍 Fetching alerts...',
  get_vehicle_paths: '🚗 Checking vehicle paths...',
  get_badge_events: '🪪 Checking badge events...',
  get_drone_log: '🚁 Reading drone logs...',
  correlate_events: '🔗 Correlating events...',
  flag_for_followup: '🚩 Flagging for follow-up...',
}

export default function AgentPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [toolsUsed, setToolsUsed] = useState<string[]>([])
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [showBriefing, setShowBriefing] = useState(false)
  const [briefingKey, setBriefingKey] = useState(0)
  const hasStarted = useRef(false)

  const investigate = async () => {
    setIsLoading(true)
    setToolsUsed([])
    setAnalysis('')
    setError('')

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Good morning. Please investigate last night and tell me what happened, what matters, and what needs follow-up before the 8 AM review.'
          }]
        })
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setToolsUsed(data.toolsUsed ?? [])
        setAnalysis(data.text ?? '')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    setTimeout(investigate, 500)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-200 font-semibold text-sm">AI Investigation</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {isLoading
                ? '🟡 Agent investigating...'
                : analysis
                ? '🟢 Investigation complete'
                : '⚪ Starting...'}
            </p>
          </div>
          {!isLoading && analysis && (
            <button
              onClick={investigate}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Re-run
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-2">
            <div className="bg-blue-950 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300 font-mono animate-pulse">
              ⏳ Agent is investigating all overnight events...
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}

        {/* Tools used */}
        {toolsUsed.length > 0 && (
          <div className="space-y-1.5">
            {toolsUsed.map((toolName, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border bg-slate-800 border-slate-700 text-slate-400"
              >
                <span>✅</span>
                <span>{toolLabels[toolName] ?? toolName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Analysis */}
        {analysis && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
              {analysis}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Morning Briefing Button */}
      <div className="p-4 border-t border-slate-800">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
          onClick={() => {
            setBriefingKey(k => k + 1)
            setShowBriefing(true)
          }}
        >
          📋 Generate Morning Briefing
        </Button>
      </div>

      {/* Morning Briefing Modal */}
      {showBriefing && (
        <MorningBriefing
          key={briefingKey}
          agentSummary={analysis}
          onClose={() => setShowBriefing(false)}
        />
      )}
    </div>
  )
}
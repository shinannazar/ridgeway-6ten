'use client'

import { useChat } from 'ai/react'
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
  const { messages, append, isLoading } = useChat({
    api: '/api/agent',
    maxSteps: 15,
    onError: (error) => console.error('Chat error:', error)
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const [briefingKey, setBriefingKey] = useState(0)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    setTimeout(() => {
      append({
        role: 'user',
        content: 'Good morning. Please investigate last night and tell me what happened, what matters, and what needs follow-up before the 8 AM review.'
      })
    }, 500)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get the last assistant text message as summary
  const agentSummary = messages
    .filter(m => m.role === 'assistant' && m.content)
    .map(m => m.content)
    .join('\n\n')

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
                : messages.length > 1
                ? '🟢 Investigation complete'
                : '⚪ Starting...'}
            </p>
          </div>
          {!isLoading && messages.length > 1 && (
            <button
              onClick={() => append({
                role: 'user',
                content: 'Please re-investigate and give me an updated summary.'
              })}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Re-run
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => {
          if (msg.role === 'user') return null
          return (
            <div key={msg.id} className="space-y-2">
              {msg.toolInvocations?.map((tool, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border ${
                    tool.state === 'result'
                      ? 'bg-slate-800 border-slate-700 text-slate-400'
                      : 'bg-blue-950 border-blue-800 text-blue-300'
                  }`}
                >
                  <span>{tool.state === 'result' ? '✅' : '⏳'}</span>
                  <span>{toolLabels[tool.toolName] ?? tool.toolName}</span>
                </div>
              ))}
              {msg.content && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Morning Briefing Button */}
      <div className="p-4 border-t border-slate-800 space-y-2">
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
    agentSummary={agentSummary}
    onClose={() => setShowBriefing(false)}
  />
)}
    </div>
  )
}
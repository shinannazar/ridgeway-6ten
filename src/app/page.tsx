'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AgentPanel from '@/components/AgentPanel'
import SiteMap from '@/components/SiteMap'
import EventsPanel from '@/components/EventsPanel'

type Alert = {
  id: string
  type: string
  zone: string
  timestamp?: string
  severity: string
  description: string
  status?: string
}

export default function Home() {
  const [selectedAlert, setSelectedAlert] = useState < Alert | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUser(user)
    })
  }, [])

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">Ridgeway Site</span>
            <h1 className="text-white font-bold text-lg leading-tight">6:10 Assistant</h1>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="bg-amber-950 border border-amber-800 rounded px-2 py-1">
            <span className="text-amber-400 text-xs font-mono">⚠ 4 events overnight</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-slate-400 text-xs">Signed in as</div>
            <div className="text-white text-sm font-medium">Maya · Ops Lead</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            M
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left Panel - Events */}
        <EventsPanel
          onAlertSelect={setSelectedAlert}
          selectedAlertId={selectedAlert?.id}
        />

        {/* Center - Map */}
        <div className="flex-1 bg-slate-950 relative">
          <SiteMap onAlertClick={setSelectedAlert} />
          {/* Morning Review Countdown */}
          <div className="absolute top-4 right-4 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-right z-10">
            <p className="text-slate-400 text-xs">Morning review in</p>
            <p className="text-white font-mono font-bold text-xl">1h 47m</p>
            <p className="text-slate-500 text-xs">Nisha arrives at 08:00</p>
          </div>
        </div>

        {/* Right Panel - AI Agent */}
        <div className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col">
          <AgentPanel />
        </div>
      </div>
    </main>
  )
}
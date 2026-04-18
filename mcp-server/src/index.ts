import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const tools = [
  {
    name: 'get_alerts',
    description: 'Get security alerts from the night. Filter by zone or severity.',
    parameters: {
      type: 'object',
      properties: {
        zone: { type: 'string', description: 'Zone name to filter by (optional)' },
        severity: { type: 'string', description: 'Severity level: low, medium, high (optional)' }
      }
    }
  },
  {
    name: 'get_vehicle_paths',
    description: 'Get vehicle movement paths recorded during the night.',
    parameters: {
      type: 'object',
      properties: {
        zone: { type: 'string', description: 'Zone name to filter by (optional)' }
      }
    }
  },
  {
    name: 'get_badge_events',
    description: 'Get badge swipe events. Useful for checking access point failures.',
    parameters: {
      type: 'object',
      properties: {
        gate: { type: 'string', description: 'Gate or access point name (optional)' },
        status: { type: 'string', description: 'Filter by status: failed or success (optional)' }
      }
    }
  },
  {
    name: 'get_drone_log',
    description: 'Get drone patrol logs including waypoints and observations.',
    parameters: {
      type: 'object',
      properties: {
        zone: { type: 'string', description: 'Zone the drone patrolled (optional)' }
      }
    }
  },
  {
    name: 'correlate_events',
    description: 'Find all events that occurred in the same zone within a time window. Use this to find connections between alerts.',
    parameters: {
      type: 'object',
      properties: {
        zone: { type: 'string', description: 'Zone name to correlate events for' },
        start_time: { type: 'string', description: 'Start of time window in ISO format' },
        end_time: { type: 'string', description: 'End of time window in ISO format' }
      },
      required: ['zone']
    }
  },
  {
    name: 'flag_for_followup',
    description: 'Flag an alert as needing follow-up with a reason.',
    parameters: {
      type: 'object',
      properties: {
        alert_id: { type: 'string', description: 'UUID of the alert to flag' },
        reason: { type: 'string', description: 'Reason this alert needs follow-up' }
      },
      required: ['alert_id', 'reason']
    }
  }
]

// ─── TOOL HANDLERS ────────────────────────────────────────────────────────────

async function handleTool(name: string, params: any) {
  switch (name) {

    case 'get_alerts': {
      let query = supabase.from('alerts').select('*').order('timestamp', { ascending: true })
      if (params.zone) query = query.ilike('zone', `%${params.zone}%`)
      if (params.severity) query = query.eq('severity', params.severity)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { alerts: data, count: data?.length ?? 0 }
    }

    case 'get_vehicle_paths': {
      let query = supabase.from('vehicle_paths').select('*')
      if (params.zone) query = query.ilike('zone', `%${params.zone}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { vehicle_paths: data, count: data?.length ?? 0 }
    }

    case 'get_badge_events': {
      let query = supabase.from('badge_events').select('*').order('timestamp', { ascending: true })
      if (params.gate) query = query.ilike('gate', `%${params.gate}%`)
      if (params.status) query = query.eq('status', params.status)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { badge_events: data, count: data?.length ?? 0 }
    }

    case 'get_drone_log': {
      let query = supabase.from('drone_logs').select('*')
      if (params.zone) query = query.ilike('zone', `%${params.zone}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { drone_logs: data, count: data?.length ?? 0 }
    }

    case 'correlate_events': {
      const [alerts, vehicles, badges, drones] = await Promise.all([
        supabase.from('alerts').select('*').ilike('zone', `%${params.zone}%`),
        supabase.from('vehicle_paths').select('*').ilike('zone', `%${params.zone}%`),
        supabase.from('badge_events').select('*'),
        supabase.from('drone_logs').select('*').ilike('zone', `%${params.zone}%`)
      ])
      return {
        zone: params.zone,
        alerts: alerts.data ?? [],
        vehicle_paths: vehicles.data ?? [],
        badge_events: badges.data ?? [],
        drone_logs: drones.data ?? [],
        summary: `Found ${alerts.data?.length ?? 0} alerts, ${vehicles.data?.length ?? 0} vehicle paths, ${badges.data?.length ?? 0} badge events, ${drones.data?.length ?? 0} drone logs in/near ${params.zone}`
      }
    }

    case 'flag_for_followup': {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'needs_followup' })
        .eq('id', params.alert_id)
      if (error) return { error: error.message }
      return { success: true, message: `Alert ${params.alert_id} flagged: ${params.reason}` }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// List all available tools
app.get('/tools', (req, res) => {
  res.json({ tools })
})

// Execute a tool
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params
  const params = req.body ?? {}

  console.log(`🔧 Tool called: ${toolName}`, params)

  const result = await handleTool(toolName, params)

  console.log(`✅ Tool result: ${toolName}`, JSON.stringify(result).slice(0, 100))

  res.json(result)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tools: tools.map(t => t.name) })
})

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 MCP Tool Server running on http://localhost:${PORT}`)
  console.log(`📦 Tools available: ${tools.map(t => t.name).join(', ')}`)
})
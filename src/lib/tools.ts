import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function handleTool(name: string, params: any) {
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
      return { success: true, message: `Alert ${params.alert_id} flagged: ${params.reason ?? 'needs review'}` }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
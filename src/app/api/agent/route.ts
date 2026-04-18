import { google } from '@ai-sdk/google'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { handleTool } from '@/lib/tools'

export const maxDuration = 60

async function callTool(toolName: string, params: Record<string, unknown>) {
  console.log(`Calling tool: ${toolName}`)
  try {
    const result = await handleTool(toolName, params)
    console.log(`Tool result ${toolName}:`, JSON.stringify(result).slice(0, 100))
    return result
  } catch (err) {
    console.error(`Tool error ${toolName}:`, err)
    return { error: String(err) }
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('Agent called with messages:', messages.length)

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: `You are the 6:10 Assistant — an AI investigator for Ridgeway Site operations.

It is 6:10 AM. Maya, the operations lead, has just arrived. She has less than 2 hours before the morning review with site head Nisha at 8:00 AM.

Raghav (night supervisor) left a note: "Please check Block C before leadership asks."

MANDATORY INVESTIGATION STEPS - YOU MUST CALL ALL OF THESE TOOLS EVERY TIME:
1. ALWAYS call get_alerts first
2. ALWAYS call get_vehicle_paths 
3. ALWAYS call get_badge_events
4. ALWAYS call get_drone_log
5. ALWAYS call correlate_events with zone "Block C Storage Yard"
6. ALWAYS call correlate_events with zone "Gate 3 Perimeter"
7. ALWAYS call flag_for_followup for any high severity unresolved alerts

DO NOT stop after just one tool call. You MUST call ALL tools before writing your summary.
DO NOT write any analysis until you have called all 6 tools above.

RESPONSE STYLE:
- Be direct and concise — Maya is under time pressure
- Always state your confidence level (High / Medium / Low)
- Clearly separate: confirmed facts vs inferences vs unknowns
- Never make confident claims about things you cannot verify
- Highlight Block C specifically given Raghav's note
- End with clear action items for the 8 AM review`,

      messages,
      maxSteps: 10,

      tools: {
        get_alerts: tool({
          description: 'Get security alerts from the night. Filter by zone or severity.',
          parameters: z.object({
            zone: z.string().optional().describe('Zone name to filter by'),
            severity: z.string().optional().describe('Severity: low, medium, high')
          }),
          execute: async (params) => callTool('get_alerts', params)
        }),

        get_vehicle_paths: tool({
          description: 'Get vehicle movement paths recorded during the night.',
          parameters: z.object({
            zone: z.string().optional().describe('Zone name to filter by')
          }),
          execute: async (params) => callTool('get_vehicle_paths', params)
        }),

        get_badge_events: tool({
          description: 'Get badge swipe events at access points.',
          parameters: z.object({
            gate: z.string().optional().describe('Gate or access point name'),
            status: z.string().optional().describe('Filter by status: failed or success')
          }),
          execute: async (params) => callTool('get_badge_events', params)
        }),

        get_drone_log: tool({
          description: 'Get drone patrol logs including waypoints and observations.',
          parameters: z.object({
            zone: z.string().optional().describe('Zone the drone patrolled')
          }),
          execute: async (params) => callTool('get_drone_log', params)
        }),

        correlate_events: tool({
          description: 'Find all events in the same zone to discover connections.',
          parameters: z.object({
            zone: z.string().describe('Zone name to correlate events for'),
            start_time: z.string().optional().describe('Start of time window ISO format'),
            end_time: z.string().optional().describe('End of time window ISO format')
          }),
          execute: async (params) => callTool('correlate_events', params)
        }),

        flag_for_followup: tool({
          description: 'Flag an alert as needing follow-up with a reason.',
          parameters: z.object({
            alert_id: z.string().describe('UUID of the alert to flag'),
            reason: z.string().describe('Reason this alert needs follow-up')
          }),
          execute: async (params) => callTool('flag_for_followup', params)
        })
      }
    })

    console.log('streamText completed successfully')
    return result.toDataStreamResponse()

  } catch (err: unknown) {
    console.error('🔴 Agent error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export async function GET() {
  try {
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: 'Say hello in one word.',
    })
    return Response.json({ success: true, text: result.text })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
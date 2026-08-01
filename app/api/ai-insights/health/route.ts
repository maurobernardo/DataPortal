import { NextResponse } from 'next/server'
import { getAiModel, hasAnthropicConfig } from '@/lib/ai'

export async function GET() {
  return NextResponse.json({
    configured: hasAnthropicConfig(),
    model: getAiModel(),
  })
}

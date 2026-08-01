export function hasAnthropicConfig(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

export function getAiModel(): string {
  return process.env.AI_MODEL?.trim() || 'claude-sonnet-5'
}

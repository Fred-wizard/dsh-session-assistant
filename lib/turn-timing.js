// Only patch labels for synthetic Codex imports. Native DSH rounds keep their clocks.
export function matchImportedTurnTiming(events, prompts) {
  const durationsByText = new Map()
  for (const { text, durationMs } of prompts) {
    if (!durationsByText.has(text)) durationsByText.set(text, durationMs)
    else if (durationsByText.get(text) !== durationMs) durationsByText.set(text, null)
  }
  const turns = {}
  let current
  for (const event of events) {
    if (event.type === 'turn/start') {
      current = { turn: event.data.turn, start: event.time, prompt: null }
    } else if (event.type === 'user/message' && current && !current.prompt &&
               /^msg-u\d+$/.test(event.data.id) && event.data.source?.kind === 'user') {
      current.prompt = event.data.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n')
    } else if (event.type === 'turn/end' && current?.turn === event.data.turn) {
      if (current.prompt && event.data.reason?.kind === 'completed' && event.time - current.start < 1000) {
        turns[current.turn] = durationsByText.get(current.prompt) ?? null
      }
      current = null
    }
  }
  return turns
}

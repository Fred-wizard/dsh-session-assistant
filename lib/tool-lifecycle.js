// Codex histories can end mid-tool or contain a tool result from an earlier
// segment. DSH V4 requires every tool in a completed step to be settled once.
export function normalizeToolLifecycles(events) {
  const normalized = []
  const remapped = new Map()
  const tools = new Map()
  let repairs = 0
  const startSeq = events[0]?.seq ?? 0
  function add(event) {
    normalized.push({ ...event, seq: startSeq + normalized.length })
  }
  for (const event of events) {
    let data = event.data
    switch (event.type) {
      case 'step/start':
        tools.clear()
        break
      case 'assistant/message': {
        const content = data.message.content.filter((block) => {
          if (block.type !== 'tool-call') return true
          if (tools.has(block.id)) { repairs++; return false }
          tools.set(block.id, { block, started: false })
          return true
        })
        if (!content.length) continue
        if (content.length !== data.message.content.length) data = { ...data, message: { ...data.message, content } }
        break
      }
      case 'tool/call': {
        const tool = tools.get(data.callId)
        if (!tool || tool.started) { repairs++; continue }
        tool.started = true
        const { name, arguments: args } = tool.block
        data = { ...data, name, arguments: args }
        break
      }
      case 'tool/result': {
        if (event.surfaceOp !== 'append') break
        const id = data.message.toolCallId || data.message.source?.callId
        if (!tools.get(id)?.started) { repairs++; continue }
        tools.delete(id)
        break
      }
      case 'step/end':
        for (const [id, tool] of tools) {
          const { turn, step } = data
          if (!tool.started) {
            add({ type: 'tool/call', time: event.time, data: {
              turn, step, callId: id, name: tool.block.name, arguments: tool.block.arguments,
            } })
          }
          add({ type: 'tool/result', time: event.time, surfaceOp: 'append', data: {
            turn, step, message: {
              id: 'codex-tool-missing-' + event.seq + '-' + repairs,
              role: 'tool', toolCallId: id, source: { kind: 'tool', callId: id }, isError: true,
              content: [{ type: 'text', text: 'No tool result was recorded in the exported Codex conversation.' }],
            },
          } })
          repairs++
        }
        tools.clear()
        break
      case 'session/title':
        if (Array.isArray(data.messageSeqs)) {
          data = { ...data, messageSeqs: data.messageSeqs.map((seq) => remapped.get(seq) ?? seq) }
        }
        break
    }
    remapped.set(event.seq, startSeq + normalized.length)
    add(data === event.data ? event : { ...event, data })
  }
  return { events: normalized, repairs }
}

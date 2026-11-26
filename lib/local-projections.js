import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'

export function sourceMetadata(codexDir) {
  const rows = new Map()
  let db
  try {
    db = new DatabaseSync(join(codexDir, 'state_5.sqlite'), { readOnly: true })
    for (const row of db.prepare('SELECT id, name, updated_at_ms, updated_at, attached_thread_parent_id, archived FROM threads').all()) {
      rows.set(row.id, row)
    }
  } finally {
    db?.close()
  }
  return rows
}

export async function indexMigratedSessions(ctx, state, codexDir, onlyIds) {
  const cache = ctx.get('sessionProjectionCache')
  const projections = ctx.get('sessionProjections')
  const persistence = ctx.get('sessionPersistence')
  if (!cache || !projections || !persistence) {
    throw new Error('DSH session projection services are unavailable')
  }

  const results = { indexed: 0, alreadyIndexed: 0, titlesAligned: 0, empty: [], failures: [] }
  const source = sourceMetadata(codexDir)
  for (const [sourceKey, entry] of Object.entries(state.sessions)) {
    const id = entry.dshSessionId
    if (!id || (onlyIds && !onlyIds.has(id))) continue
    let handle
    try {
      handle = await persistence.open(id, 'read')
      const header = handle.header
      const metadata = source.get(sourceKey.split('::', 1)[0])
      const current = cache.cachedSnapshot(header)?.values
      const title = metadata?.name?.trim()
      const fromFile = Math.max(0, ...Object.values(entry.files || {}).map((file) => Math.trunc(Number(file.version)) || 0))
      const updatedAt = metadata?.updated_at_ms || (metadata?.updated_at ? metadata.updated_at * 1000 : fromFile)
      if (current?.sessionListMetadata?.lastPromptAt && current?.title &&
          (!title || current.title === title) && (!updatedAt || current.sessionListMetadata.lastPromptAt === updatedAt)) {
        results.alreadyIndexed++
        continue
      }
      let { events } = await handle.read()
      if (!events?.length) {
        results.empty.push(id)
        continue
      }
      const oldTitle = events.findLast((event) => event.type === 'session/title')
      if (title && oldTitle?.data.title !== title && oldTitle?.data.source?.kind !== 'user') {
        await handle.close()
        handle = await persistence.open(id, 'write')
        const event = {
          type: 'session/title',
          seq: events.length,
          time: Math.max(events.at(-1).time, updatedAt),
          data: { title, messageSeqs: [], source: { kind: 'user' } },
        }
        await handle.append([event])
        await handle.flush()
        events = [...events, event]
        results.titlesAligned++
      }
      const restored = projections.restore({}, events, 0, header, 0)
      const listRow = restored.checkpoint.sessionListMetadata
      if (listRow && updatedAt > 0) {
        listRow.val = { ...listRow.val, lastPromptAt: Math.max(header.createdAt, updatedAt) }
      }
      await cache.put(id, {
        formatVersion: header.version,
        createdAt: header.createdAt,
        cwd: header.cwd,
        isSeeded: header.isSeeded,
        inheritedEventCount: 0,
      }, restored.checkpoint)
      const controller = ctx.get('sessionController')
      if (controller?.listState?.summarizeCold) {
        ctx.emit('api-session/added', controller.listState.summarizeCold({ header, formatStatus: 'current' }))
      }
      results.indexed++
    } catch (error) {
      results.failures.push({ id, error: error.message })
    } finally {
      try { await handle?.close() } catch (error) {
        results.failures.push({ id, error: 'Close: ' + error.message })
      }
    }
  }
  return results
}

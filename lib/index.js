import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Remote, RemoteError, TypertRemoteService, principalOf } from '@deepseek-ai/dsh-typert-protocol'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { createLogic } from './logic.js'
import { indexMigratedSessions, sourceMetadata } from './local-projections.js'

export const name = 'dsh-codex-sidebar'
export const inject = ['timer', 'tools', 'sessionPersistence', 'workspaceRegistry',
  'sessionProjectionCache', 'sessionProjections', 'sessionController']

class CodexSidebarService extends TypertRemoteService {
  constructor(ctx, actions) {
    super(ctx, 'codexSidebar')
    this.actions = actions
  }

  checkOwner() {
    if (principalOf(this.ctx.invocation)) {
      throw new RemoteError('gateway/forbidden', 'Codex sync is available to the DSH owner.')
    }
  }

  getSidebar() { this.checkOwner(); return this.actions.get() }
  syncSidebar() { this.checkOwner(); return this.actions.sync() }
  getImportedTurnTiming(args) { this.checkOwner(); return this.actions.turnTiming(args) }
}

for (const method of ['getSidebar', 'syncSidebar', 'getImportedTurnTiming']) {
  Remote(method)(CodexSidebarService.prototype[method], {
    kind: 'method', name: method, static: false, private: false,
    addInitializer(initializer) {
      // Register the decorator's prototype metadata before DSH mounts the service.
      initializer.call(Object.create(CodexSidebarService.prototype))
    },
  })
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
}

export async function apply(ctx, config = {}) {
  const home = resolveDshHome()
  const logic = createLogic(ctx, {
    ...config,
    outputDir: config.outputDir || join(home, 'codex-sidebar'),
    localSidebarIntegration: true,
  }, home)
  let active = true
  let running = null
  let lastSync = null

  function snapshot() {
    const current = logic.getState({}).config
    return { current, state: readJson(join(current.outputDir, 'state.json'), { sessions: {} }) }
  }

  function get() {
    const { current, state } = snapshot()
    const attachedParents = {}
    if (!current.codexDir) return { hidden: [], recency: {}, attachedParents, lastSync, syncing: running !== null }
    const source = sourceMetadata(current.codexDir)
    const hidden = []
    const recency = {}
    const imported = new Map(Object.entries(state.sessions).filter(([, entry]) => entry.dshSessionId)
      .map(([key, entry]) => [key.split('::', 1)[0], entry.dshSessionId]))
    for (const [key, entry] of Object.entries(state.sessions)) {
      const metadata = source.get(key.split('::', 1)[0])
      if (!entry.dshSessionId || !metadata) continue
      if (metadata.attached_thread_parent_id || metadata.archived) hidden.push(entry.dshSessionId)
      const parent = imported.get(metadata.attached_thread_parent_id)
      if (parent && parent !== entry.dshSessionId) attachedParents[entry.dshSessionId] = parent
      if (metadata.updated_at_ms) recency[entry.dshSessionId] = metadata.updated_at_ms
    }
    return { hidden, recency, attachedParents, lastSync, syncing: running !== null }
  }

  function turnTiming(args) {
    const id = args?.sessionId
    if (typeof id !== 'string' || id.length > 200) return { turns: {} }
    const { state } = snapshot()
    const entry = Object.values(state.sessions).find((item) => item.dshSessionId === id)
    return entry ? logic.getImportedTurnTiming(entry) : { turns: {} }
  }

  function sync() {
    if (running) return running
    running = (async () => {
      const before = snapshot()
      if (!before.current.codexDir) throw new Error('Codex data directory was not found.')
      sourceMetadata(before.current.codexDir)
      const indexPath = join(before.current.outputDir, 'sidebar-index.json')
      const indexed = new Set(readJson(indexPath, []))
      const result = await logic.syncNow({ trigger: 'sidebar-incremental' })
      const status = result.status.lastSyncResult
      if (!status?.ok) throw new Error(status?.error?.message || 'Codex sync failed')
      const { current, state } = snapshot()
      const candidates = new Set(Object.values(state.sessions).map((entry) => entry.dshSessionId)
        .filter((id) => id && !indexed.has(id)))
      const review = candidates.size ? await indexMigratedSessions(ctx, state, current.codexDir, candidates) : null
      const failedIds = new Set(review?.failures.map((failure) => failure.id))
      for (const id of candidates) if (!failedIds.has(id)) indexed.add(id)
      if (candidates.size) {
        const draft = indexPath + '.' + process.pid + '.tmp'
        writeFileSync(draft, JSON.stringify([...indexed]), 'utf8')
        renameSync(draft, indexPath)
      }
      lastSync = {
        at: Date.now(),
        imported: status.dsh.imported,
        memories: status.memories.copied,
        failures: status.sessions.failed + status.dsh.failed + (review?.failures.length || 0),
      }
      return { ...get(), syncing: false }
    })().finally(() => { running = null })
    return running
  }

  await logic.init()
  new CodexSidebarService(ctx, { get, sync, turnTiming })
  ctx.effect(() => () => { active = false; logic.dispose() }, 'codex-sidebar: cleanup')
  ctx.effect(() => ctx.tools.register({
    name: 'codex_memory_search',
    description: 'Search local Markdown memories imported from Codex. Returns excerpts as historical reference.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', minLength: 1, maxLength: 160 } },
      required: ['query'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) { return [{ type: 'text', text: JSON.stringify(value) }] },
    },
    execute({ query }) { return { matches: logic.searchMigratedMemory(query) } },
  }), 'codex-sidebar: memory search')
  if (config.autoImportOnStart !== false && active && snapshot().current.codexDir) {
    void sync().catch((error) => ctx.logger.warn('Codex sidebar import:', error.message))
  }
}

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

export async function applyCodexSidebar(registry, filename, state) {
  const { projects, pins } = JSON.parse(readFileSync(filename, 'utf8'))
  const known = [...registry.list()]
  const desired = []
  const missing = []
  for (const project of projects) {
    try {
      let workspace = await registry.resolveByPath(project.path)
      if (!workspace) workspace = await registry.create(project.path, project.label)
      if (!desired.includes(workspace.id)) desired.push(workspace.id)
      if (workspace.title === basename(project.path) && workspace.title !== project.label) {
        await workspace.setTitle(project.label)
      }
    } catch {
      missing.push(project.label)
    }
  }
  let anchor = known.find((workspace) => !desired.includes(workspace.id))?.id
  for (const id of desired.toReversed()) {
    await registry.insertBefore(id, anchor)
    anchor = id
  }
  const matching = pins.map((id) => Object.entries(state.sessions).find(([key, value]) =>
    key.startsWith(id + '::') && value.dshSessionId && !value.sourceArchived)?.[1].dshSessionId).filter(Boolean)
  for (const id of matching.toReversed()) {
    if (registry.pinnedSessionIds.includes(id)) await registry.unpinSession(id)
    await registry.pinSession(id)
  }
  return { projects: desired.length, missing, pins: matching.length }
}

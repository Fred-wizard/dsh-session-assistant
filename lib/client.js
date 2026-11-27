window.__ModuleLoader__.load({
  id: "dsh-codex-sidebar",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
const React = require('react')

const inject = ['slots', 'remote', 'timer', 'sessions', 'workspaces', 'uiWorkspace', 'uiSession', 'remoteAccess']

function apply(ctx) {
  const mounted = ctx.remote.$mount(SIDEBAR_REMOTE)
  ctx.effect(() => () => { void mounted.then((release) => release()).catch(() => {}) }, 'codex-sidebar: remote')
  mountCodexSidebar(ctx, async (method, ...args) => {
    await mounted
    const remote = ctx.get('remote.codexSidebar') ?? ctx.remote.namespaces?.get('codexSidebar')?.service
    if (!remote) throw new Error('Codex sidebar service is unavailable')
    const result = await remote[method](...args)
    if (result?.ok === false) throw new Error(result.error?.message || 'Codex sync failed')
    return result?.value ?? result
  })
}

exports.apply = apply
exports.inject = inject

function mountCodexSidebar(ctx, call) {
const { createPortal } = require('react-dom')
const {
  IconLoadingOutlineRegular, IconPinFillRegular, IconPinOutlineRegular,
  IconRefreshOutlineRegular, Toast, Tooltip,
} = require('@deepseek-ai/dsh-client-ui-primitives')
const h = React.createElement
const anchorSelector = '[data-sidebar-scrollport] [data-sidebar-workspace-header]'
const style = `
  .dsh-local-sessions { margin: 2px 0 8px; min-width: 0; }
  .dsh-local-sessions-group { margin: 0 12px 6px; }
  .dsh-local-sessions-heading, .dsh-local-sessions-more {
    border: 0; background: transparent; color: var(--dsw-alias-label-secondary);
    font: inherit; font-size: 12px; cursor: pointer;
    padding: 5px 8px; text-align: start; border-radius: 6px;
  }
  .dsh-local-sessions-heading { width: 100%; display: flex; align-items: center; gap: 6px; }
  .dsh-local-sessions-heading span:last-child { margin-inline-start: auto; }
  .dsh-local-sessions-list { list-style: none; margin: 1px 0 0; padding: 0; }
  .dsh-local-sessions-row { display: flex; align-items: center; gap: 2px; border-radius: 8px; min-width: 0; }
  .dsh-local-sessions-row:is(:hover,:focus-within), .dsh-local-sessions-row[data-current="true"],
  .dsh-local-sessions-heading:hover, .dsh-local-sessions-more:hover {
    background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb,currentColor 7%,transparent));
  }
  .dsh-local-sessions-open { flex: 1; min-width: 0; text-align: start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dsh-local-sessions-open, .dsh-local-sessions-pin {
    border: 0; background: transparent; font: inherit; color: var(--dsw-alias-label-primary);
    font-size: 13px; padding: 6px 8px; cursor: pointer; border-radius: 6px;
  }
  .dsh-local-sessions-pin { opacity: 0; flex: none; display: grid; place-items: center; }
  .dsh-local-sessions-row:is(:hover,:focus-within) .dsh-local-sessions-pin,
  .dsh-local-sessions-pin[aria-pressed="true"] { opacity: 1; }
  @media (hover: none) { .dsh-local-sessions-pin { opacity: 1; } }
  .dsh-local-sessions button:focus-visible, .dsh-codex-sync:focus-visible {
    outline: 2px solid var(--dsw-alias-brand-primary, Highlight); outline-offset: -2px;
  }
  .dsh-local-sessions-empty, .dsh-local-sessions-status {
    margin: 1px 8px 4px; color: var(--dsw-alias-label-secondary); font-size: 12px;
  }
  :has(> [data-dsh-codex-footer]) {
    position: relative; box-sizing: border-box; padding-inline-end: 36px;
  }
  [data-dsh-codex-footer] {
    position: absolute; inset-inline-end: 8px; inset-block-start: 50%;
    transform: translateY(-50%); display: flex; z-index: 1;
  }
  .dsh-codex-sync {
    display: grid; place-items: center; width: 28px; height: 28px; padding: 0;
    border: 0; border-radius: 6px; background: transparent;
    color: var(--dsw-alias-label-secondary); cursor: pointer;
  }
  @media (hover: hover) {
    .dsh-codex-sync { opacity: 0; pointer-events: none; }
    :hover:has(> [data-dsh-codex-footer]) .dsh-codex-sync,
    .dsh-codex-sync:focus-visible,
    .dsh-codex-sync[aria-busy="true"] { opacity: 1; pointer-events: auto; }
  }
  .dsh-codex-sync:not([aria-disabled="true"]):hover {
    background: var(--dsw-alias-interactive-bg-hover, color-mix(in srgb,currentColor 7%,transparent));
    color: var(--dsw-alias-label-primary);
  }
  .dsh-codex-sync[aria-disabled="true"] { cursor: progress; }
  .dsh-codex-sync[aria-busy="true"] .dsh-codex-sync-icon {
    animation: dsh-codex-sync-spin 800ms linear infinite;
  }
  @keyframes dsh-codex-sync-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .dsh-codex-sync[aria-busy="true"] .dsh-codex-sync-icon { animation: none; }
  }
  button[data-turn-process][data-dsh-codex-timing] > span:first-child { display: none; }
  button[data-turn-process][data-dsh-codex-timing]::before { content: attr(data-dsh-codex-timing); }
`

function useAnchors() {
  const [target, setTarget] = React.useState(null)
  const [footerTarget, setFooterTarget] = React.useState(null)
  React.useLayoutEffect(() => {
    const portal = document.createElement('div')
    const footer = document.createElement('div')
    footer.setAttribute('data-dsh-codex-footer', '')
    function locate() {
      const header = document.querySelector(anchorSelector)
      if (header?.parentElement) {
        if (header.previousElementSibling !== portal) header.before(portal)
        setTarget(portal)
      } else if (portal.isConnected) {
        portal.remove()
        setTarget(null)
      }
      const account = header && document.querySelector('[data-slot="sidebar.settings"]')
      if (account?.parentElement) {
        if (account.nextElementSibling !== footer) account.after(footer)
        setFooterTarget(footer)
      } else if (footer.isConnected) {
        footer.remove()
        setFooterTarget(null)
      }
    }
    locate()
    const observer = new MutationObserver(locate)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sidebar-scrollport'] })
    return () => { observer.disconnect(); portal.remove(); footer.remove() }
  }, [])
  return { target, footerTarget }
}

function useSnapshot(source) {
  return React.useSyncExternalStore(
    React.useCallback((listener) => source.subscribe(listener), [source]),
    React.useCallback(() => source.getSnapshot(), [source]),
  )
}

function useExpanded(id) {
  const key = 'dsh-codex-sidebar:' + id
  const [expanded, setExpanded] = React.useState(() => localStorage.getItem(key) !== 'closed')
  return [expanded, () => {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem(key, next ? 'open' : 'closed')
  }]
}

function Section({ id, label, children }) {
  const [expanded, toggle] = useExpanded(id)
  const panelId = React.useId()
  return h('section', { className: 'dsh-local-sessions-group', 'aria-label': label },
    h('button', {
      className: 'dsh-local-sessions-heading', type: 'button', onClick: toggle,
      'aria-expanded': expanded, 'aria-controls': panelId,
    }, h('span', null, label), h('span', { 'aria-hidden': true }, expanded ? '⌄' : '›')),
    h('div', { id: panelId, hidden: !expanded }, expanded ? children : null))
}

function dateValue(value) {
  return typeof value === 'number' ? value : Date.parse(value || '') || 0
}

function importedTurnLabel(ms, zh) {
  if (ms === null) return zh ? '已完成' : 'Completed'
  const seconds = Math.floor(ms / 1000)
  if (!seconds) return zh ? '已完成，不到 1 秒' : 'Completed in <1s'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const remaining = seconds % 60
  const parts = [
    hours && (zh ? hours + ' 小时' : hours + 'h'),
    minutes && (zh ? minutes + ' 分' : minutes + 'm'),
    remaining && (zh ? remaining + ' 秒' : remaining + 's'),
  ].filter(Boolean).join(' ')
  return (zh ? '已完成，用时 ' : 'Completed in ') + parts
}

function useImportedTurnLabels(sessionId, zh) {
  React.useEffect(() => {
    if (typeof sessionId !== 'string' || !sessionId.startsWith('session-cx')) return
    let current = true
    let observer
    const attribute = 'data-dsh-codex-timing'
    const changed = new Map()
    function reset(button) {
      const original = changed.get(button)
      button.removeAttribute(attribute)
      if (original === null) button.removeAttribute('aria-label')
      else button.setAttribute('aria-label', original)
      changed.delete(button)
    }
    void call('getImportedTurnTiming', { sessionId }).then(({ turns }) => {
      if (!current || !Object.keys(turns).length) return
      function refresh() {
        for (const button of changed.keys()) if (!button.isConnected) reset(button)
        for (const button of document.querySelectorAll('button[data-turn-process]')) {
          const turn = button.getAttribute('data-turn-process')
          if (!Object.hasOwn(turns, turn)) {
            if (changed.has(button)) reset(button)
            continue
          }
          const label = importedTurnLabel(turns[turn], zh)
          if (!changed.has(button)) changed.set(button, button.getAttribute('aria-label'))
          if (button.getAttribute(attribute) !== label) button.setAttribute(attribute, label)
          if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label)
        }
      }
      refresh()
      observer = new MutationObserver(refresh)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-turn-process'] })
    }).catch(() => {})
    return () => {
      current = false
      observer?.disconnect()
      for (const button of changed.keys()) reset(button)
    }
  }, [sessionId, zh])
}

function attachmentRules(parents, visible, pinned, archived) {
  const selectors = []
  for (const [child, parent] of Object.entries(parents || {})) {
    if (!/^session-cx[\w-]+$/.test(child) || !visible[parent] ||
        pinned.has(child) || archived.has(child) || archived.has(parent)) continue
    selectors.push('[data-sidebar-scrollport] [role="tree"] [data-row-key="session:' + child + '"]')
  }
  return selectors.length ? selectors.join(',\n') + ' { display: none; }' : ''
}

function Row({ id, title, isPinned, active, access, zh, disabled, onOpen, onPin }) {
  const pinAction = isPinned ? 'workspace/unpinSession' : 'workspace/pinSession'
  const permission = React.useMemo(() => access.source('session', id, pinAction), [access, id, pinAction])
  const canPin = useSnapshot(permission)
  const pinLabel = zh ? (isPinned ? '取消置顶' : '置顶会话') : (isPinned ? 'Unpin session' : 'Pin session')
  return h('li', { className: 'dsh-local-sessions-row', 'data-current': active },
    h('button', { className: 'dsh-local-sessions-open', type: 'button', title,
      'aria-current': active ? 'page' : undefined, onClick: () => onOpen(id) }, title),
    canPin && h('button', { type: 'button', className: 'dsh-local-sessions-pin', title: pinLabel,
      'aria-label': pinLabel + ' · ' + title, 'aria-pressed': isPinned, disabled,
      onClick: () => void onPin(id, isPinned) },
    h(isPinned ? IconPinFillRegular : IconPinOutlineRegular, { size: 14, 'aria-hidden': true })))
}

function Sidebar({ sessions, workspaces, navigation, locale, sessionUi, access }) {
  const { target, footerTarget } = useAnchors()
  const list = useSnapshot(sessions.list)
  const workspace = useSnapshot(workspaces.list)
  const [showMore, setShowMore] = React.useState(false)
  const [status, setStatus] = React.useState('')
  const [pending, setPending] = React.useState(null)
  const [syncing, setSyncing] = React.useState(false)
  const [syncFailed, setSyncFailed] = React.useState(false)
  const [syncToast, setSyncToast] = React.useState(false)
  const [codex, setCodex] = React.useState({ hidden: [], recency: {} })
  const ui = useSnapshot(sessionUi.current)
  const zh = locale().startsWith('zh')
  const active = ui?.sessionId ?? ui?.binding?.sessionId ??
    list.ids.find((id) => (list.byId[id]?.retainedBy?.mainView ?? 0) > 0)
  useImportedTurnLabels(active, zh)
  React.useEffect(() => {
    let mounted = true
    const refresh = () => {
      void call('getSidebar').then((value) => { if (mounted) setCodex(value) }).catch(() => {})
    }
    refresh()
    const stop = ctx.interval(refresh, codex.syncing ? 500 : 15000)
    return () => { mounted = false; stop() }
  }, [Boolean(codex.syncing)])
  if (!target) return null

  const archived = new Set(workspace.archivedSessionIds || [])
  const hidden = new Set(codex.hidden || [])
  const pins = (workspace.pinnedSessionIds || []).filter((id) => list.byId[id] && !archived.has(id))
  const pinned = new Set(pins)
  const activity = (id, value) => Math.max(dateValue(value.updatedAt), dateValue(codex.recency?.[id]))
  const recent = Object.entries(list.byId).filter(([id, value]) =>
    !pinned.has(id) && !archived.has(id) && !hidden.has(id) && !value.blank && !value.parentSessionId && value.origin !== 'subagent' &&
    value.displayTitle && dateValue(value.updatedAt) > 0)
    .sort(([leftId, left], [rightId, right]) =>
      activity(rightId, right) - activity(leftId, left) || leftId.localeCompare(rightId))

  async function syncCodex() {
    if (syncing || codex.syncing) return
    setSyncing(true)
    setSyncFailed(false)
    setSyncToast(false)
    try {
      const next = await call('syncSidebar')
      setCodex(next)
      setSyncFailed(Boolean(next.lastSync?.failures))
      if (next.lastSync && !next.lastSync.failures) setSyncToast(true)
    } catch {
      setSyncFailed(true)
    } finally { setSyncing(false) }
  }

  async function changePin(id, isPinned) {
    setPending(id)
    setStatus('')
    try {
      if (isPinned) await navigation.unpinSession(id)
      else await navigation.pinSession(id)
    } catch {
      setStatus(zh ? '无法更新会话置顶状态' : 'Could not update the pin.')
    } finally { setPending(null) }
  }

  function row(id, isPinned) {
    const title = list.byId[id].displayTitle || (zh ? '未命名会话' : 'Untitled session')
    return h(Row, {
      id, key: id, title, isPinned, active: active === id, access, zh, disabled: pending !== null,
      onOpen: (sessionId) => navigation.openSession(sessionId), onPin: changePin,
    })
  }

  const busy = syncing || Boolean(codex.syncing)
  const syncLabel = busy ? (zh ? '正在同步 Codex 会话和记忆' : 'Syncing Codex conversations and memories') :
    syncFailed ? (zh ? 'Codex 同步未完成，点击重试' : 'Codex sync incomplete. Retry') :
      (zh ? '同步 Codex 会话和记忆' : 'Sync Codex conversations and memories')
  const syncControl = footerTarget && createPortal(h(Tooltip, {
    label: syncLabel, side: 'top', align: 'end', delayMs: 350, portal: true,
  }, h('button', {
    type: 'button', className: 'dsh-codex-sync', 'aria-label': syncLabel,
    'aria-disabled': busy, 'aria-busy': busy, onClick: () => void syncCodex(),
  }, h(busy ? IconLoadingOutlineRegular : IconRefreshOutlineRegular, {
    size: 14, className: 'dsh-codex-sync-icon', 'aria-hidden': true,
  }))), footerTarget)

  const lists = createPortal(h('div', { className: 'dsh-local-sessions' },
    h('style', null, attachmentRules(codex.attachedParents, list.byId, pinned, archived)),
    pins.length > 0 && h(Section, { id: 'pinned', label: zh ? '置顶会话' : 'Pinned sessions' },
      h('ul', { className: 'dsh-local-sessions-list' }, pins.map((id) => row(id, true)))),
    h(Section, { id: 'recent', label: zh ? '最近会话' : 'Recent sessions' },
      recent.length ? h('ul', { className: 'dsh-local-sessions-list' }, recent.slice(0, showMore ? 20 : 5).map(([id]) => row(id, false))) :
        h('p', { className: 'dsh-local-sessions-empty' }, zh ? '暂无会话' : 'No recent sessions'),
      recent.length > 5 && h('button', { type: 'button', className: 'dsh-local-sessions-more',
        'aria-expanded': showMore, onClick: () => setShowMore(!showMore) },
      zh ? (showMore ? '收起' : '显示更多') : (showMore ? 'Show fewer' : 'Show more'))),
    status && h('p', { role: 'status', className: 'dsh-local-sessions-status' }, status),
    syncToast && h(Toast, {
      tone: 'success', text: zh ? '同步完成' : 'Sync complete', onDone: () => setSyncToast(false),
    })), target)
  return h(React.Fragment, null, lists, syncControl)
}

function apply(ctx) {
  ctx.effect(() => {
    const sheet = document.createElement('style')
    sheet.textContent = style
    document.head.append(sheet)
    return () => sheet.remove()
  }, 'codex-sidebar: styles')
  const props = {
    sessions: ctx.get('sessions'),
    workspaces: ctx.get('workspaces'),
    navigation: ctx.get('uiWorkspace'),
    sessionUi: ctx.get('uiSession'),
    access: ctx.get('remoteAccess'),
    locale: () => document.documentElement.lang || navigator.language,
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'dsh-codex-sidebar' },
    () => h(Sidebar, props),
  ))
}

apply(ctx)
}

const schema = {
  parse(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Codex sidebar requires an object')
    }
    return value
  },
}

const codec = {
  mode: 'strict',
  typeSymbol: 'dsh-codex-sidebar#SidebarObject',
  create: () => schema,
  schema,
}

const SIDEBAR_REMOTE = {
  package: 'dsh-codex-sidebar',
  descriptors: ['getSidebar', 'syncSidebar', 'getImportedTurnTiming'].map((method) => ({
    id: 'dsh-codex-sidebar#codexSidebar/' + method,
    service: 'codexSidebar',
    namespace: 'codexSidebar',
    method,
    invocation: { kind: 'direct' },
    parameters: method === 'getImportedTurnTiming' ?
      [{ name: 'args', wire: 'args', source: 'json', codec }] : [],
    result: codec,
  })),
}

    return module.exports;
  }
});

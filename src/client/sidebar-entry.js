const React = require('react')

const inject = ['slots', 'remote', 'timer', 'sessions', 'workspaces', 'uiWorkspace', 'uiSession', 'remoteAccess']

function apply(ctx) {
  const mounted = ctx.remote.$mount(SIDEBAR_REMOTE)
  ctx.effect(() => () => { void mounted.then((release) => release()).catch(() => {}) }, 'codex-sidebar: remote')
  mountCodexSidebar(ctx, async (method) => {
    await mounted
    const remote = ctx.get('remote.codexSidebar') ?? ctx.remote.namespaces?.get('codexSidebar')?.service
    if (!remote) throw new Error('Codex sidebar service is unavailable')
    const result = await remote[method]()
    if (result?.ok === false) throw new Error(result.error?.message || 'Codex sync failed')
    return result?.value ?? result
  })
}

exports.apply = apply
exports.inject = inject

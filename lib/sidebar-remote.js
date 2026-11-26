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

export const SIDEBAR_REMOTE = {
  package: 'dsh-codex-sidebar',
  descriptors: ['getSidebar', 'syncSidebar'].map((method) => ({
    id: 'dsh-codex-sidebar#codexSidebar/' + method,
    service: 'codexSidebar',
    namespace: 'codexSidebar',
    method,
    invocation: { kind: 'direct' },
    parameters: [],
    result: codec,
  })),
}

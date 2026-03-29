import { resolve } from 'node:path'

export function resolveStatusDir(rootDir) {
  const fromEnv = process.env.STATUS_DIR
  if (fromEnv && String(fromEnv).trim()) return resolve(rootDir, fromEnv)
  return resolve(rootDir, '../docs/status')
}

export function resolveRunbookDir(rootDir) {
  const fromEnv = process.env.RUNBOOK_DIR
  if (fromEnv && String(fromEnv).trim()) return resolve(rootDir, fromEnv)
  return resolve(rootDir, '../docs/runbooks')
}

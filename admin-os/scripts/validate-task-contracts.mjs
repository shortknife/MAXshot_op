import path from 'node:path'
import { validateTaskContracts } from '../lib/dev-harness/task-contracts.ts'

const repoRoot = path.resolve(process.cwd(), '..')

try {
  const result = validateTaskContracts(repoRoot)
  console.log(`[task-contracts] validated ${result.count} contract(s): ${result.slugs.join(', ')}`)
} catch (error) {
  console.error('[task-contracts] validation failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

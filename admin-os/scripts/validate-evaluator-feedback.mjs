import path from 'node:path'
import { validateTaskContracts, loadTaskContracts } from '../lib/dev-harness/task-contracts.ts'
import { validateEvaluatorFeedback } from '../lib/dev-harness/evaluator-feedback.ts'

const repoRoot = path.resolve(process.cwd(), '..')

try {
  validateTaskContracts(repoRoot)
  const contracts = loadTaskContracts(repoRoot)
  const result = validateEvaluatorFeedback(repoRoot, contracts.map((item) => item.slug))
  console.log(`[evaluator-feedback] validated ${result.count} file(s): ${result.slugs.join(', ')}`)
} catch (error) {
  console.error('[evaluator-feedback] validation failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

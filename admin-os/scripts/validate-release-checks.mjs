import path from 'node:path'
import { loadTaskContracts, validateTaskContracts } from '../lib/dev-harness/task-contracts.ts'
import { loadEvaluatorFeedback, validateEvaluatorFeedback } from '../lib/dev-harness/evaluator-feedback.ts'
import { validateReleaseChecks } from '../lib/dev-harness/release-checks.ts'

const repoRoot = path.resolve(process.cwd(), '..')

try {
  validateTaskContracts(repoRoot)
  const contracts = loadTaskContracts(repoRoot)
  validateEvaluatorFeedback(repoRoot, contracts.map((item) => item.slug))
  const feedback = loadEvaluatorFeedback(repoRoot)
  const result = validateReleaseChecks(repoRoot, {
    contractSlugs: contracts.map((item) => item.slug),
    feedbackSlugs: feedback.map((item) => item.slug),
  })
  console.log(`[release-checks] validated ${result.count} file(s): ${result.slugs.join(', ')}`)
} catch (error) {
  console.error('[release-checks] validation failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

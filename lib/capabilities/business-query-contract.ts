import type { CapabilityOutput } from '@/lib/router/types/capability'
import { validateDataQueryOutputContract } from '@/lib/capabilities/contracts/data-query-contract'

export function buildContractFinalizer(inputContract: { passed: boolean; errors: string[] }) {
  return function finalizeOutput(output: CapabilityOutput): CapabilityOutput {
    const outputContract = validateDataQueryOutputContract(output)
    return {
      ...output,
      metadata: {
        ...(output.metadata || {}),
        contract_validation: {
          version: 'v1.0',
          input_passed: inputContract.passed,
          input_errors: inputContract.errors,
          output_passed: outputContract.passed,
          output_errors: outputContract.errors,
          contract_passed: inputContract.passed && outputContract.passed,
        },
      },
    }
  }
}

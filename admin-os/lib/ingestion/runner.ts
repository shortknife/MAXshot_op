import type { CanonicalIngestionPayload, GateDecision, SourceSystem } from './contract';
import { writeCanonicalFacts, type FactWriteResult } from './fact-writer';
import { adaptAndValidateMorphoPayload } from './morpho-adapter';
import { adaptAndValidateNativePayload } from './native-adapter';
import type { QuarantineRecord } from './quarantine';

interface SharedDb {
  from(table: string): {
    insert(payload: unknown): Promise<{ error: { message?: string } | null }>;
  };
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: { success?: boolean; execution_id?: string; message?: string } | null;
    error: { message?: string } | null;
  }>;
}

export type IngestionStatus = 'quarantined' | 'written';

export interface IngestionRunResult {
  status: IngestionStatus;
  source_system: SourceSystem;
  payload: CanonicalIngestionPayload;
  decision: GateDecision;
  quarantineRecord?: QuarantineRecord;
  factWrite?: FactWriteResult;
}

export async function runIngestion(
  sourceSystem: SourceSystem,
  input: unknown,
  db?: SharedDb,
): Promise<IngestionRunResult> {
  const adapted = sourceSystem === 'native'
    ? await adaptAndValidateNativePayload(input as never, db as never)
    : await adaptAndValidateMorphoPayload(input as never, db as never);

  if (adapted.decision.outcome === 'quarantined') {
    return {
      status: 'quarantined',
      source_system: sourceSystem,
      payload: adapted.payload,
      decision: adapted.decision,
      quarantineRecord: adapted.quarantineRecord,
    };
  }

  const factWrite = await writeCanonicalFacts(adapted.payload, db as never);
  return {
    status: 'written',
    source_system: sourceSystem,
    payload: adapted.payload,
    decision: adapted.decision,
    factWrite,
  };
}

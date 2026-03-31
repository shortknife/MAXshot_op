import { supabase } from '../supabase';
import type {
  CanonicalIngestionPayload,
  GateDecision,
  GateFinding,
  GateOutcome,
  IngestionEnvironment,
  SourceSystem,
} from './contract';

export const INGESTION_QUARANTINE_TABLE = 'ingestion_quarantine';

export interface QuarantineRecord {
  source_system: SourceSystem;
  source_execution_ref: string;
  workflow_id: string | null;
  environment: IngestionEnvironment;
  gate_outcome: GateOutcome;
  reasons: GateFinding[];
  raw_archive_ref: string | null;
  source_workflow_name: string | null;
  critical_event: boolean;
  critical_reason: string | null;
  payload_snapshot: CanonicalIngestionPayload;
  created_at: string;
}

interface SupabaseInsertResult {
  error: { message?: string } | null;
}

interface SupabaseInsertBuilder {
  insert(payload: QuarantineRecord): PromiseLike<SupabaseInsertResult> | SupabaseInsertResult;
}

interface SupabaseLike {
  from(table: string): SupabaseInsertBuilder;
}

function nullIfEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function clonePayload(payload: CanonicalIngestionPayload): CanonicalIngestionPayload {
  return JSON.parse(JSON.stringify(payload)) as CanonicalIngestionPayload;
}

export function buildQuarantineRecord(
  payload: CanonicalIngestionPayload,
  decision: GateDecision,
  now: string = new Date().toISOString(),
): QuarantineRecord {
  return {
    source_system: payload.source_system,
    source_execution_ref: payload.source_execution_ref,
    workflow_id: nullIfEmpty(payload.workflowId),
    environment: payload.environment,
    gate_outcome: decision.outcome,
    reasons: decision.findings.map((finding) => ({ ...finding })),
    raw_archive_ref: nullIfEmpty(payload.raw_archive_ref),
    source_workflow_name: nullIfEmpty(payload.source_workflow_name),
    critical_event: payload.is_critical_event,
    critical_reason: nullIfEmpty(payload.critical_reason),
    payload_snapshot: clonePayload(payload),
    created_at: now,
  };
}

export async function writeQuarantineRecord(
  record: QuarantineRecord,
  db: SupabaseLike = supabase as unknown as SupabaseLike,
): Promise<QuarantineRecord> {
  const { error } = await db.from(INGESTION_QUARANTINE_TABLE).insert(record);
  if (error) {
    throw new Error(`failed_to_write_ingestion_quarantine:${error.message || 'unknown_error'}`);
  }
  return record;
}

export async function quarantinePayload(
  payload: CanonicalIngestionPayload,
  decision: GateDecision,
  db: SupabaseLike = supabase as unknown as SupabaseLike,
): Promise<QuarantineRecord> {
  if (decision.outcome !== 'quarantined') {
    throw new Error(`quarantine_requires_quarantined_outcome:${decision.outcome}`);
  }
  const record = buildQuarantineRecord(payload, decision);
  return writeQuarantineRecord(record, db);
}

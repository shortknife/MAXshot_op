import type {
  CanonicalAllocationRow,
  CanonicalIngestionPayload,
  CanonicalMarketRow,
  GateDecision,
  GateFinding,
} from './contract';

function trimmed(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidIsoDate(value: string | null | undefined): boolean {
  const normalized = trimmed(value);
  return normalized.length > 0 && !Number.isNaN(Date.parse(normalized));
}

function pushError(findings: GateFinding[], code: string, path: string, message: string): void {
  findings.push({ code, severity: 'error', path, message });
}

function pushWarning(findings: GateFinding[], code: string, path: string, message: string): void {
  findings.push({ code, severity: 'warning', path, message });
}

function validateRequiredString(findings: GateFinding[], code: string, path: string, value: string | null | undefined): void {
  if (trimmed(value).length === 0) {
    pushError(findings, code, path, `${path} is required`);
  }
}

function validateMarketRow(findings: GateFinding[], row: CanonicalMarketRow, index: number): void {
  validateRequiredString(findings, 'missing_market_chain', `markets[${index}].chain`, row.chain);
  validateRequiredString(findings, 'missing_market_protocol', `markets[${index}].protocolName`, row.protocolName);
  validateRequiredString(findings, 'missing_market_name', `markets[${index}].market`, row.market);
}

function validateAllocationRow(findings: GateFinding[], row: CanonicalAllocationRow, index: number): void {
  validateRequiredString(findings, 'missing_allocation_chain', `allocationData[${index}].chain`, row.chain);
  validateRequiredString(findings, 'missing_allocation_protocol', `allocationData[${index}].protocolName`, row.protocolName);
  validateRequiredString(findings, 'missing_allocation_market', `allocationData[${index}].market`, row.market);
  validateRequiredString(findings, 'missing_allocation_asset', `allocationData[${index}].asset`, row.asset);
}

export function evaluateQualityGate(payload: CanonicalIngestionPayload): GateDecision {
  const findings: GateFinding[] = [];

  validateRequiredString(findings, 'missing_source_system', 'source_system', payload.source_system);
  validateRequiredString(findings, 'missing_source_execution_ref', 'source_execution_ref', payload.source_execution_ref);
  validateRequiredString(findings, 'missing_environment', 'environment', payload.environment);
  validateRequiredString(findings, 'missing_workflow_id', 'workflowId', payload.workflowId);
  validateRequiredString(findings, 'missing_status', 'status', payload.status);

  if (!isValidIsoDate(payload.createdAt)) {
    pushError(findings, 'invalid_created_at', 'createdAt', 'createdAt must be a valid ISO timestamp');
  }

  if (payload.environment === 'unknown') {
    pushError(findings, 'unknown_environment', 'environment', 'environment must be explicitly classified');
  }

  validateRequiredString(findings, 'missing_vault_name', 'vaultName', payload.vaultName ?? '');

  payload.markets.forEach((row, index) => validateMarketRow(findings, row, index));
  payload.allocationData.forEach((row, index) => validateAllocationRow(findings, row, index));

  if (payload.startedAt && !isValidIsoDate(payload.startedAt)) {
    pushWarning(findings, 'invalid_started_at', 'startedAt', 'startedAt should be a valid ISO timestamp');
  }

  if (payload.stoppedAt && !isValidIsoDate(payload.stoppedAt)) {
    pushWarning(findings, 'invalid_stopped_at', 'stoppedAt', 'stoppedAt should be a valid ISO timestamp');
  }

  if (payload.is_critical_event && trimmed(payload.critical_reason).length === 0) {
    pushWarning(findings, 'missing_critical_reason', 'critical_reason', 'critical_reason is recommended when is_critical_event=true');
  }

  const hasError = findings.some((finding) => finding.severity === 'error');
  const hasWarning = findings.some((finding) => finding.severity === 'warning');

  return {
    outcome: hasError ? 'quarantined' : hasWarning ? 'accepted_with_warnings' : 'accepted',
    findings,
  };
}

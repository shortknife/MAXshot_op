import type { IngestionEnvironment } from './contract';

const TEST_MARKERS = ['test', 'testnet', 'devnet', 'sepolia'];
const STAGING_MARKERS = ['staging', 'sandbox', 'uat'];

function hasMarker(value: string, markers: string[]): boolean {
  const normalized = value.trim().toLowerCase();
  return markers.some((marker) => normalized.includes(marker));
}

export function classifyEnvironment(candidates: Array<string | null | undefined>): IngestionEnvironment {
  const values = candidates.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (values.some((value) => hasMarker(value, TEST_MARKERS))) {
    return 'test';
  }

  if (values.some((value) => hasMarker(value, STAGING_MARKERS))) {
    return 'staging';
  }

  if (values.length === 0) {
    return 'unknown';
  }

  return 'prod';
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export const READ_ONLY_DEMO = process.env.NEXT_PUBLIC_READ_ONLY_DEMO === 'true'
export const WRITE_ENABLED = process.env.NEXT_PUBLIC_WRITE_ENABLE === 'true'
export const WRITE_CONFIRM_TOKEN = process.env.WRITE_CONFIRM_TOKEN || ''

export function assertWriteEnabled(params: { operatorId?: string; confirmToken?: string }) {
  if (READ_ONLY_DEMO) {
    throw new Error('write_blocked_read_only')
  }
  if (!WRITE_ENABLED) {
    throw new Error('write_blocked_disabled')
  }
  if (!params.operatorId) {
    throw new Error('write_blocked_missing_operator')
  }
  if (!params.confirmToken || params.confirmToken !== WRITE_CONFIRM_TOKEN) {
    throw new Error('write_blocked_invalid_token')
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期时间为 UTC 时间字符串
 * @param dateString ISO 日期字符串
 * @returns 格式化的 UTC 时间字符串 (YYYY-MM-DD HH:MM:SS UTC)
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '') + ' UTC'
}


export function buildWriteBlockedEvent(params: {
  reason: string
  operatorId?: string
  requestPath?: string
  ip?: string | null
}) {
  return {
    timestamp: new Date().toISOString(),
    event_type: 'write_blocked',
    event_type_canonical: 'safety.policy_event',
    data: {
      reason: params.reason,
      status: 'blocked',
      step_status: 'blocked',
      operator_id: params.operatorId || null,
      request_path: params.requestPath || null,
      ip: params.ip || null,
    },
  }
}

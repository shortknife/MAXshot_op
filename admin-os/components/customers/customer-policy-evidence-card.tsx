import type { CustomerPolicyEvidence } from '@/lib/customers/runtime-policy'

type Tone = 'slate' | 'emerald' | 'amber' | 'sky' | 'violet'

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: Tone }) {
  const styles = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }[tone]

  return <span className={`rounded-full border px-3 py-1 text-xs ${styles}`}>{children}</span>
}

export function CustomerPolicyEvidenceCard({
  evidence,
  title = 'Customer Policy Evidence',
  compact = false,
}: {
  evidence: CustomerPolicyEvidence | null | undefined
  title?: string
  compact?: boolean
}) {
  if (!evidence) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-700">{evidence.summary}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {evidence.primary_plane ? <Pill tone="sky">{`plane: ${evidence.primary_plane}`}</Pill> : null}
        {evidence.default_entry_path ? <Pill>{`entry: ${evidence.default_entry_path}`}</Pill> : null}
        <Pill tone="emerald">{`policy: ${evidence.policy_version}`}</Pill>
        {evidence.auth_primary_method ? <Pill tone="violet">{`auth: ${evidence.auth_primary_method}`}</Pill> : null}
        {evidence.auth_verification_posture ? <Pill tone="amber">{`verify: ${evidence.auth_verification_posture}`}</Pill> : null}
      </div>
      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {evidence.review_escalation_style ? <Pill>{`review: ${evidence.review_escalation_style}`}</Pill> : null}
          {evidence.clarification_style ? <Pill>{`clarify: ${evidence.clarification_style}`}</Pill> : null}
          {evidence.preferred_capability_count > 0 ? <Pill>{`caps: ${evidence.preferred_capability_count}`}</Pill> : null}
          {evidence.focused_surfaces.slice(0, 3).map((surface) => <Pill key={surface}>{`surface: ${surface}`}</Pill>)}
        </div>
      ) : null}
    </div>
  )
}

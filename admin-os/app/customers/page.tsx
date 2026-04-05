import type { ReactNode } from 'react'
import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadOperatorRegistry } from '@/lib/customers/access'
import { loadCustomerMemoryWorkbench } from '@/lib/customers/memory'
import { loadCustomerWalletAsset } from '@/lib/customers/asset-runtime'
import { listActiveCustomers } from '@/lib/customers/runtime'
import { getCapabilityExecutionPolicy } from '@/lib/router/capability-catalog'
import { CurrentCustomerBadge } from '@/components/customers/current-customer-badge'

export const dynamic = 'force-dynamic'

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' }) {
  const styles = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }[tone]
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles}`}>{children}</span>
}

export default async function CustomersPage() {
  const customers = listActiveCustomers()
  const operators = loadOperatorRegistry().operators
  const cards = await Promise.all(
    customers.map(async (customer) => ({
      customer,
      memory: await loadCustomerMemoryWorkbench(customer.customer_id),
      wallet: await loadCustomerWalletAsset(customer.customer_id),
    })),
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0fdf4_0%,#f8fafc_42%,#eff6ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
              <div className="mt-1 text-sm text-slate-500">Customer-aware platform workspace. Focused on long-term memory, capability boundary, and wallet contract posture.</div>
            </div>
            <AppNav current="customers" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Customer Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6">
              {cards.map(({ customer, memory, wallet }) => (
                <div key={customer.customer_id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.93))] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{customer.customer_id}</div>
                      <div className="text-xl font-semibold tracking-tight text-slate-950">{customer.name}</div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone="emerald">{customer.status}</Pill>
                        <Pill tone="sky">solution: {customer.solution_key}</Pill>
                        {customer.default_kb_scope ? <Pill>scope: {customer.default_kb_scope}</Pill> : null}
                        <CurrentCustomerBadge customerId={customer.customer_id} />
                      </div>
                      {customer.notes ? <div className="max-w-2xl text-sm leading-6 text-slate-600">{customer.notes}</div> : null}
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 xl:min-w-[18rem]">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Operator Scope</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {operators.filter((operator) => operator.allowed_customers.includes('*') || operator.allowed_customers.includes(customer.customer_id)).map((operator) => (
                          <Pill key={`${customer.customer_id}-${operator.operator_id}`} tone="violet">{operator.operator_id}</Pill>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Long-Term Memory</div>
                        <div className="mt-3 text-sm leading-6 text-slate-700">{memory.asset?.summary || 'No curated customer memory summary yet.'}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(memory.asset?.preferred_planes || []).map((plane) => <Pill key={`${customer.customer_id}-plane-${plane}`} tone="sky">plane: {plane}</Pill>)}
                          {(memory.asset?.preferred_query_modes || []).map((mode) => <Pill key={`${customer.customer_id}-mode-${mode}`} tone="amber">mode: {mode}</Pill>)}
                          {(memory.asset?.preferred_scopes || []).map((scope) => <Pill key={`${customer.customer_id}-scope-${scope}`}>scope: {scope}</Pill>)}
                          {(memory.asset?.language_preferences || []).map((lang) => <Pill key={`${customer.customer_id}-lang-${lang}`} tone="violet">lang: {lang}</Pill>)}
                          {memory.asset?.response_style ? <Pill tone="emerald">style: {memory.asset.response_style}</Pill> : null}
                        </div>
                        {(memory.asset?.guardrails || []).length > 0 ? (
                          <div className="mt-4 space-y-1 text-sm text-slate-600">
                            {memory.asset?.guardrails.map((item) => <div key={`${customer.customer_id}-${item}`}>- {item}</div>)}
                          </div>
                        ) : null}
                        {memory.profile ? (
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-600">
                            <div className="font-medium text-slate-900">Runtime preference signals</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill tone="emerald">interactions: {memory.profile.total_interactions}</Pill>
                              {memory.profile.top_planes.map((plane) => <Pill key={`${customer.customer_id}-runtime-plane-${plane.plane}`}>{plane.plane} × {plane.count}</Pill>)}
                            </div>
                            <div className="mt-3 space-y-1">
                              {memory.profile.top_capabilities.map((cap) => <div key={`${customer.customer_id}-${cap.capability_id}`}>capability: {cap.capability_id} × {cap.count}</div>)}
                              {memory.profile.top_issue_reasons.map((reason) => <div key={`${customer.customer_id}-${reason.reason}`}>issue: {reason.reason} × {reason.count}</div>)}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Capability Boundary</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {customer.allowed_capabilities.map((capabilityId) => (
                            <Pill key={`${customer.customer_id}-${capabilityId}`} tone="sky">{capabilityId.replace('capability.', '')}</Pill>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {customer.mutation_capabilities.length > 0 ? customer.mutation_capabilities.map((capabilityId) => {
                            const policy = getCapabilityExecutionPolicy(capabilityId)
                            return <Pill key={`${customer.customer_id}-mutation-${capabilityId}`} tone="rose">{capabilityId.replace('capability.', '')}{policy?.mutation_scope ? ` · ${policy.mutation_scope}` : ''}</Pill>
                          }) : <Pill>read-only</Pill>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Wallet Contract</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Pill tone={wallet?.status === 'active' ? 'emerald' : 'slate'}>{wallet?.status || 'inactive'}</Pill>
                          <Pill tone={wallet?.wallet_mode === 'agent_ready' ? 'emerald' : wallet?.wallet_mode === 'manual_review' ? 'amber' : 'slate'}>{wallet?.wallet_mode || 'disabled'}</Pill>
                          {wallet?.settlement_asset ? <Pill tone="sky">asset: {wallet.settlement_asset}</Pill> : null}
                          {wallet?.preferred_network ? <Pill tone="violet">network: {wallet.preferred_network}</Pill> : null}
                        </div>
                        <div className="mt-4 text-sm leading-6 text-slate-700">{wallet?.summary || 'No wallet support configured.'}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {wallet?.provider ? <Pill>provider: {wallet.provider}</Pill> : null}
                          <Pill tone={wallet?.execution_enabled ? 'emerald' : 'slate'}>{wallet?.execution_enabled ? 'execution enabled' : 'execution disabled'}</Pill>
                          <Pill tone={wallet?.payment_enabled ? 'emerald' : 'slate'}>{wallet?.payment_enabled ? 'payment enabled' : 'payment disabled'}</Pill>
                        </div>
                        {(wallet?.supported_actions || []).length > 0 ? (
                          <div className="mt-4 space-y-2 text-sm text-slate-600">
                            {wallet?.supported_actions.map((action) => <div key={`${customer.customer_id}-wallet-${action}`}>- {action}</div>)}
                          </div>
                        ) : null}
                        {(wallet?.notes || []).length > 0 ? (
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-600">
                            {wallet?.notes.map((note) => <div key={`${customer.customer_id}-note-${note}`}>- {note}</div>)}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Enabled Planes</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {customer.enabled_planes.map((plane) => <Pill key={`${customer.customer_id}-enabled-${plane}`}>{plane}</Pill>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

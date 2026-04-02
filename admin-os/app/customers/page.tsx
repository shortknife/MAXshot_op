import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listActiveCustomers } from '@/lib/customers/runtime'
import { loadOperatorRegistry } from '@/lib/customers/access'

export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  const customers = listActiveCustomers()
  const capabilityCount = new Set(customers.flatMap((customer) => customer.allowed_capabilities)).size
  const mutationCustomers = customers.filter((customer) => customer.mutation_capabilities.length > 0).length
  const operators = loadOperatorRegistry().operators
  const wildcardOperators = operators.filter((operator) => operator.allowed_customers.includes('*')).length

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf7ff_0%,#f8fafc_42%,#fff7ed_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
              <div className="mt-1 text-sm text-slate-500">Platform-level customer registry for solution binding, KB ownership, and capability exposure control.</div>
            </div>
            <AppNav current="customers" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-indigo-500/15 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Active Customers</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{customers.length}</div>
              <div className="mt-2 text-sm text-slate-600">Runtime-visible customers available for FAQ / KB binding.</div>
            </div>
            <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Capability Surface</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{capabilityCount}</div>
              <div className="mt-2 text-sm text-slate-600">Distinct capabilities currently exposed across active customers.</div>
            </div>
            <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mutation Enabled</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{mutationCustomers}</div>
              <div className="mt-2 text-sm text-slate-600">Customers currently allowed to run bounded write-side workflows.</div>
            </div>
            <div className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-pink-500/15 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Operators</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{operators.length}</div>
              <div className="mt-2 text-sm text-slate-600">Operator registry entries. {wildcardOperators} platform-wide operator(s) currently span all customers.</div>
            </div>
          </section>

          <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Customer Registry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {customers.map((customer) => (
                <div key={customer.customer_id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{customer.customer_id}</div>
                      <div className="text-xl font-semibold tracking-tight text-slate-950">{customer.name}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">{customer.status}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">solution: {customer.solution_key}</span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">default scope: {customer.default_kb_scope || 'none'}</span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Enabled Planes</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {customer.enabled_planes.map((plane) => (
                            <span key={`${customer.customer_id}-${plane}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{plane}</span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mutation Controls</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {customer.mutation_capabilities.length > 0 ? customer.mutation_capabilities.map((capabilityId) => (
                            <span key={`${customer.customer_id}-${capabilityId}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">{capabilityId.replace('capability.', '')}</span>
                          )) : <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">read-only customer</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white/75 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Allowed Capabilities</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {customer.allowed_capabilities.map((capabilityId) => (
                        <span key={`${customer.customer_id}-allowed-${capabilityId}`} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          {capabilityId.replace('capability.', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                  {customer.notes ? <div className="mt-4 text-sm leading-6 text-slate-600">{customer.notes}</div> : null}
                </div>
              ))}
            </CardContent>
          </Card>


          <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Operator Boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {operators.map((operator) => (
                <div key={operator.operator_id} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{operator.operator_id}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{operator.role}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {operator.allowed_customers.map((customerId) => (
                        <span key={`${operator.operator_id}-${customerId}`} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-700">{customerId === '*' ? 'all-customers' : customerId}</span>
                      ))}
                    </div>
                  </div>
                  {operator.notes ? <div className="mt-3 text-sm text-slate-600">{operator.notes}</div> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

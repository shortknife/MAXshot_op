import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listActiveCustomers } from '@/lib/customers/runtime'

export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  const customers = listActiveCustomers()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf7ff_0%,#f8fafc_42%,#fff7ed_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
              <div className="mt-1 text-sm text-slate-500">Platform-level customer registry for solution binding, KB ownership, and future tenant controls.</div>
            </div>
            <AppNav current="customers" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-indigo-500/15 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Active Customers</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{customers.length}</div>
              <div className="mt-2 text-sm text-slate-600">Runtime-visible customers available for FAQ / KB binding.</div>
            </div>
          </section>

          <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Customer Registry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {customers.map((customer) => (
                <div key={customer.customer_id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{customer.customer_id}</div>
                      <div className="text-xl font-semibold tracking-tight text-slate-950">{customer.name}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">{customer.status}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">solution: {customer.solution_key}</span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">default scope: {customer.default_kb_scope || 'none'}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Enabled Planes</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customer.enabled_planes.map((plane) => (
                          <span key={`${customer.customer_id}-${plane}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">{plane}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {customer.notes ? <div className="mt-4 text-sm leading-6 text-slate-600">{customer.notes}</div> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

import { loadFaqKbManifest } from '@/lib/faq-kb/loaders'
import { loadKbSourceInventoryRuntime } from '@/lib/faq-kb/source-inventory'
import { listActiveCustomers } from '@/lib/customers/runtime'
import { KbManagementSurface } from '@/components/kb-management/kb-management-surface'

export const dynamic = 'force-dynamic'

export default async function KbManagementPage() {
  const manifest = loadFaqKbManifest()
  const inventory = await loadKbSourceInventoryRuntime()
  const customers = listActiveCustomers()

  return (
    <KbManagementSurface
      manifestDocuments={manifest.documents || []}
      customers={customers}
      inventorySource={inventory.source}
      inventoryItems={inventory.items}
    />
  )
}

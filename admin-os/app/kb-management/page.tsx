import { loadFaqKbManifest } from '@/lib/faq-kb/loaders'
import { loadKbSourceInventoryRuntime } from '@/lib/faq-kb/source-inventory'
import { KbManagementSurface } from '@/components/kb-management/kb-management-surface'

export const dynamic = 'force-dynamic'

export default async function KbManagementPage() {
  const manifest = loadFaqKbManifest()
  const inventory = await loadKbSourceInventoryRuntime()

  return (
    <KbManagementSurface
      manifestDocuments={manifest.documents || []}
      inventorySource={inventory.source}
      inventoryItems={inventory.items}
    />
  )
}

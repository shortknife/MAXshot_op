'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type NavKey = 'chat' | 'kb_management' | 'faq_review' | 'ops' | 'marketing' | 'operations' | 'outcome' | 'audit'

const NAV_ITEMS: Array<{ key: NavKey; label: string; path: string }> = [
  { key: 'chat', label: 'User Chat', path: '/chat' },
  { key: 'faq_review', label: 'FAQ Review', path: '/faq-review' },
  { key: 'kb_management', label: 'KB Management', path: '/kb-management' },
  { key: 'ops', label: 'Ops', path: '/ops' },
  { key: 'marketing', label: 'Marketing', path: '/marketing' },
  { key: 'operations', label: 'Operations', path: '/operations' },
  { key: 'outcome', label: 'Outcome', path: '/outcome' },
  { key: 'audit', label: 'Audit', path: '/audit' },
]

export function AppNav({ current }: { current?: NavKey }) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      {NAV_ITEMS.map((item) => (
        <Button
          key={item.key}
          variant={item.key === current ? 'default' : 'outline'}
          onClick={() => router.push(item.path)}
          size="sm"
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}

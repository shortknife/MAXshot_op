'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type NavKey = 'chat' | 'interaction_log' | 'learning_assets' | 'costs' | 'kb_management' | 'faq_review' | 'customers' | 'prompts' | 'ops' | 'marketing' | 'operations' | 'outcome' | 'audit'

const NAV_ITEMS: Array<{ key: NavKey; label: string; path: string }> = [
  { key: 'chat', label: 'User Chat', path: '/chat' },
  { key: 'interaction_log', label: 'Interaction Log', path: '/interaction-log' },
  { key: 'learning_assets', label: 'Learning Assets', path: '/learning-assets' },
  { key: 'costs', label: 'Runtime Cost', path: '/costs' },
  { key: 'faq_review', label: 'FAQ Review', path: '/faq-review' },
  { key: 'kb_management', label: 'KB Management', path: '/kb-management' },
  { key: 'customers', label: 'Customers', path: '/customers' },
  { key: 'prompts', label: 'Prompts', path: '/prompts' },
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

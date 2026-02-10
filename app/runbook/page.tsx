'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function RunbookPage() {
  const router = useRouter()
  const [content, setContent] = useState<string>('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/runbook')
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || data.details || 'Failed to load runbook')
        }
        setContent(data.content || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load runbook')
      }
    }
    load()
  }, [])

  const { nodes, toc } = useMemo(() => {
    const lines = content.split('\n')
    const out: JSX.Element[] = []
    const tocItems: Array<{ id: string; text: string }> = []

    const slugify = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      if (line.startsWith('# ')) {
        const text = line.replace('# ', '').trim()
        const id = slugify(text)
        out.push(<h1 id={id} key={`h1-${i}`} className="text-2xl font-bold mt-6">{text}</h1>)
        tocItems.push({ id, text })
        i += 1
        continue
      }
      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim()
        const id = slugify(text)
        out.push(<h2 id={id} key={`h2-${i}`} className="text-xl font-semibold mt-5">{text}</h2>)
        tocItems.push({ id, text })
        i += 1
        continue
      }
      if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim()
        const id = slugify(text)
        out.push(<h3 id={id} key={`h3-${i}`} className="text-lg font-semibold mt-4">{text}</h3>)
        i += 1
        continue
      }

      if (line.trim().startsWith('- ')) {
        const items: string[] = []
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          items.push(lines[i].trim().replace('- ', ''))
          i += 1
        }
        out.push(
          <ul key={`ul-${i}`} className="list-disc ml-6 space-y-1 text-sm">
            {items.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        )
        continue
      }

      if (/^\d+\.\s/.test(line.trim())) {
        const items: string[] = []
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
          i += 1
        }
        out.push(
          <ol key={`ol-${i}`} className="list-decimal ml-6 space-y-1 text-sm">
            {items.map((item, idx) => <li key={idx}>{item}</li>)}
          </ol>
        )
        continue
      }

      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].includes('---')) {
        const header = line.split('|').map(s => s.trim()).filter(Boolean)
        i += 2
        const rows: string[][] = []
        while (i < lines.length && lines[i].includes('|')) {
          rows.push(lines[i].split('|').map(s => s.trim()).filter(Boolean))
          i += 1
        }
        out.push(
          <div key={`table-${i}`} className="overflow-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {header.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-semibold border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ridx) => (
                  <tr key={ridx} className="border-t">
                    {row.map((cell, cidx) => (
                      <td key={cidx} className="px-3 py-2">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }

      if (!line.trim()) {
        out.push(<div key={`sp-${i}`} className="h-2" />)
        i += 1
        continue
      }

      out.push(<p key={`p-${i}`} className="text-sm leading-relaxed">{line}</p>)
      i += 1
    }

    return { nodes: out, toc: tocItems }
  }, [content])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Operator Runbook</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/ops')}>Ops</Button>
              <Button variant="outline" onClick={() => router.push('/marketing')}>Marketing</Button>
              <Button variant="outline" onClick={() => router.push('/operations')}>Operations Console</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 print:block">
          <aside className="hidden lg:block sticky top-4 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Contents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="block text-blue-700 hover:underline">
                    {item.text}
                  </a>
                ))}
              </CardContent>
            </Card>
          </aside>
          <Card>
            <CardHeader>
              <CardTitle>Runbook</CardTitle>
            </CardHeader>
            <CardContent>
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              <div className="space-y-2">{nodes}</div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

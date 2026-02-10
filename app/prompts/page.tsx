'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Prompt {
  slug: string
  name: string
  system_prompt: string
  user_prompt_template: string | null
  model_config: Record<string, any>
  description: string | null
  version: number
  is_active: boolean
  updated_at: string
}

export default function PromptsPage() {
  const router = useRouter()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editSystemPrompt, setEditSystemPrompt] = useState('')
  const [editUserPrompt, setEditUserPrompt] = useState('')

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prompt_library')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPrompts(data || [])
    } catch (error) {
      console.error('Error loading prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setEditSystemPrompt(prompt.system_prompt)
    setEditUserPrompt(prompt.user_prompt_template || '')
  }

  const handleSave = async () => {
    if (!selectedPrompt) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('prompt_library')
        .update({
          system_prompt: editSystemPrompt,
          user_prompt_template: editUserPrompt || null,
        })
        .eq('slug', selectedPrompt.slug)

      if (error) throw error

      await loadPrompts()
      alert('Saved successfully')
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('Save failed, please try again later')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">MAXshot Admin OS</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-3xl font-bold mb-6">Prompt Management</h2>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Prompt列表 */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Prompt List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {prompts.map((prompt) => (
                        <div
                          key={prompt.slug}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPrompt?.slug === prompt.slug
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectPrompt(prompt)}
                        >
                          <div className="font-medium">{prompt.name}</div>
                          <div className="text-sm text-gray-500 mt-1">{prompt.slug}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Prompt编辑 */}
              <div className="lg:col-span-2">
                {selectedPrompt ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedPrompt.name}</CardTitle>
                      <CardDescription>{selectedPrompt.description || selectedPrompt.slug}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label htmlFor="system-prompt">System Prompt</Label>
                        <Textarea
                          id="system-prompt"
                          value={editSystemPrompt}
                          onChange={(e) => setEditSystemPrompt(e.target.value)}
                          className="mt-2 min-h-[200px] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="user-prompt">User Prompt Template</Label>
                        <Textarea
                          id="user-prompt"
                          value={editUserPrompt}
                          onChange={(e) => setEditUserPrompt(e.target.value)}
                          className="mt-2 min-h-[150px] font-mono text-sm"
                          placeholder="Example: Topic: {topic}, Context: {context}..."
                        />
                      </div>

                      <div>
                        <Label>Model Config (Read-only)</Label>
                        <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-sm overflow-auto">
                          {JSON.stringify(selectedPrompt.model_config, null, 2)}
                        </pre>
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Model Config is read-only for now. Editing will be enabled after Alex provides the actual model configuration structure.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      Please select a Prompt from the left to edit
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

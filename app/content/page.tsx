'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/utils'

interface PublishingQueueItem {
  id: string
  publication_id: string | null
  content_type: string | null
  content_text: string | null
  status: string | null
  created_at: string
}

interface PublishingLogItem {
  id: string
  publication_id: string | null
  content_type: string | null
  published_content: string | null
  status: string | null
  platform_post_id: string | null
  created_at: string
}

export default function ContentPage() {
  const router = useRouter()
  const [queueItems, setQueueItems] = useState<PublishingQueueItem[]>([])
  const [logItems, setLogItems] = useState<PublishingLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('queue')

  const loadContent = useCallback(async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'queue') {
        const { data, error } = await supabase
          .from('publishing_queue')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: true })
          .limit(20)

        if (error) throw error
        setQueueItems(data || [])
      } else {
        const { data, error } = await supabase
          .from('publishing_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setLogItems(data || [])
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleApprove = async (id: string) => {
    // 这里可以添加审批逻辑，如果需要的话
    alert(`Approval feature to be implemented: ${id}`)
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this content?')) return

    try {
      const { error } = await supabase
        .from('publishing_queue')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error
      await loadContent()
      alert('Rejected')
    } catch (error) {
      console.error('Error rejecting content:', error)
      alert('Operation failed, please try again later')
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
          <h2 className="text-3xl font-bold mb-6">Content Preview</h2>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="queue">Pending Content</TabsTrigger>
              <TabsTrigger value="logs">Published History</TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Content</CardTitle>
                  <CardDescription>List of approved content pending publication</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">Loading...</div>
                  ) : queueItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No pending content</div>
                  ) : (
                    <div className="space-y-4">
                      {queueItems.map((item) => (
                        <div key={item.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{item.content_type || 'Unknown Type'}</div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(item.created_at)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleApprove(item.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>
                                Reject
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            {item.content_text || 'No content'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Published History</CardTitle>
                  <CardDescription>Recently published content records</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">Loading...</div>
                  ) : logItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No publishing records</div>
                  ) : (
                    <div className="space-y-4">
                      {logItems.map((item) => (
                        <div key={item.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{item.content_type || 'Unknown Type'}</div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(item.created_at)}
                              </div>
                              {item.platform_post_id && (
                                <div className="text-sm text-blue-600 mt-1">
                                  Tweet ID: {item.platform_post_id}
                                </div>
                              )}
                            </div>
                            <div className={`px-2 py-1 rounded text-sm ${
                              item.status === 'success' ? 'bg-green-100 text-green-800' :
                              item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.status}
                            </div>
                          </div>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            {item.published_content || 'No content'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  )
}

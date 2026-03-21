'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ExecutionLog {
  id: string
  workflow_id: string
  status: string
  is_success: boolean
  created_at: string
  execution_duration_ms: number | null
  started_at: string | null
  stopped_at: string | null
}

// Workflow name mapping
const workflowNameMap: Record<string, string> = {
  '01': 'Data Collection',
  '02': 'Keyword Matching',
  '03': 'AI Scoring',
  '04': 'Trend Fetching',
  '05': 'Content Generation',
  '06': 'Alpha Flash Publishing',
  '07': 'Passive Reply',
  '08': 'Proactive Reply',
  '09': 'FAQ Building',
  '12': 'Education Content Generation',
  '14': 'Transparency Weekly Report'
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflowStatus, setWorkflowStatus] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  useEffect(() => {
    loadWorkflowStatus()
  }, [])

  const loadWorkflowStatus = async () => {
    try {
      setLoading(true)
      // 查询所有执行记录
      const { data } = await supabase
        .from('execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (data) {
        // 按 workflow_id 分组，只保留每个工作流的最新记录
        const workflowMap = new Map<string, ExecutionLog>()
        data.forEach(log => {
          const existing = workflowMap.get(log.workflow_id)
          if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
            workflowMap.set(log.workflow_id, log)
          }
        })
        
        setWorkflowStatus(Array.from(workflowMap.values()))
      }
    } catch (error) {
      console.error('Error loading workflow status:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStatus = workflowStatus.filter(status => {
    if (filter === 'success') return status.is_success
    if (filter === 'failed') return !status.is_success
    return true
  })

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
          <h2 className="text-3xl font-bold mb-6">Workflow Monitoring</h2>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'success' | 'failed')} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="success">Success</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filteredStatus.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No workflow status</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStatus.map((status) => (
                <Card key={status.id} className={status.is_success ? '' : 'border-red-200'}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {workflowNameMap[status.workflow_id] || status.workflow_id}
                      </CardTitle>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          status.is_success ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <CardDescription>Workflow ID: {status.workflow_id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Execution:</span>
                        <span>{formatDateTime(status.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={status.is_success ? 'text-green-600' : 'text-red-600'}>
                          {status.status}
                        </span>
                      </div>
                      {status.execution_duration_ms && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span>{status.execution_duration_ms}ms</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

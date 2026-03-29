'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface SystemConfig {
  key: string
  value: { number?: number; boolean?: boolean; string?: string }
  description: string | null
  group_name: string | null
  workflow_id: string | null
  workflow_name: string | null
  workflow_function: string | null
  is_dashboard_visible: boolean | null
  updated_at: string
  updated_by: string | null
}

export default function ConfigsPage() {
  const router = useRouter()
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .order('workflow_id', { ascending: true, nullsFirst: false })
        .order('key', { ascending: true })

      if (error) throw error
      setConfigs(data || [])
    } catch (error) {
      console.error('Error loading configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: SystemConfig) => {
    setEditingKey(config.key)
    // 根据value类型设置编辑值
    if (config.value.number !== undefined) {
      setEditValue(config.value.number.toString())
    } else if (config.value.boolean !== undefined) {
      setEditValue(config.value.boolean.toString())
    } else if (config.value.string !== undefined) {
      setEditValue(config.value.string)
    } else {
      setEditValue('')
    }
  }

  const handleSave = async (key: string) => {
    try {
      setSaving(true)
      
      // 获取当前配置以确定类型
      const config = configs.find(c => c.key === key)
      if (!config) return

      // 根据原始类型转换值
      let newValue: { number?: number; boolean?: boolean; string?: string }
      if (config.value.number !== undefined) {
        newValue = { number: Number(editValue) }
      } else if (config.value.boolean !== undefined) {
        newValue = { boolean: editValue === 'true' || editValue === '1' }
      } else {
        newValue = { string: editValue }
      }

      const { error } = await supabase
        .from('system_configs')
        .update({ value: newValue })
        .eq('key', key)

      if (error) throw error

      setEditingKey(null)
      await loadConfigs()
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Save failed, please try again later')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
  }

  // 配置单位映射表
  const configUnitMap: Record<string, string> = {
    'alpha_flash_daily_limit': ' posts/day',
    'proactive_reply_daily_limit': ' posts/day',
    'education_post_interval_hours': ' hours',
    'global_system_switch': '', // Boolean, no unit needed
  }

  // 获取显示值（带单位）
  const getDisplayValue = (config: SystemConfig): string => {
    if (config.value.number !== undefined) {
      const unit = configUnitMap[config.key] || ''
      return `${config.value.number}${unit ? ' ' + unit : ''}`
    }
    if (config.value.boolean !== undefined) {
      return config.value.boolean ? 'Enabled' : 'Disabled'
    }
    if (config.value.string !== undefined) {
      return config.value.string
    }
    return '-'
  }

  // 获取编辑模式下的单位提示
  const getEditUnit = (key: string): string | null => {
    if (key.includes('hours') || key === 'education_post_interval_hours') {
      return ' hours'
    }
    if (key.includes('limit') || key.includes('quota') || key.includes('daily')) {
      return ' posts/day'
    }
    return null
  }

  // 按工作流分组（优先使用workflow_name，如果没有则使用group_name）
  const groupedConfigs = configs.reduce((acc, config) => {
    const groupKey = config.workflow_id || 'global'
    const groupName = config.workflow_name || config.group_name || 'Other'
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        name: groupName,
        workflow_id: config.workflow_id,
        workflow_function: config.workflow_function,
        configs: []
      }
    }
    acc[groupKey].configs.push(config)
    return acc
  }, {} as Record<string, { name: string; workflow_id: string | null; workflow_function: string | null; configs: SystemConfig[] }>)

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
          <h2 className="text-3xl font-bold mb-6">Config Center</h2>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedConfigs).map(([groupKey, group]) => (
                <Card key={groupKey}>
                  <CardHeader>
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      {group.workflow_function && (
                        <CardDescription className="mt-1">{group.workflow_function}</CardDescription>
                      )}
                      {group.workflow_id && (
                        <CardDescription className="text-xs mt-1">Workflow ID: {group.workflow_id}</CardDescription>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {group.configs.map((config) => (
                        <div key={config.key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{config.key}</div>
                            {config.description && (
                              <div className="text-sm text-gray-500 mt-1">{config.description}</div>
                            )}
                            {editingKey === config.key ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-48"
                                />
                                {getEditUnit(config.key) && (
                                  <span className="text-sm text-gray-500">{getEditUnit(config.key)}</span>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(config.key)}
                                  disabled={saving}
                                >
                                  {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancel}
                                  disabled={saving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <span className="text-sm text-gray-700">
                                  {getDisplayValue(config)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-4"
                                  onClick={() => handleEdit(config)}
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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

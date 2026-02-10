import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''

// 延迟创建客户端，避免在构建时因缺少环境变量而失败
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = 'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must be set'
      console.error(errorMsg)
      console.error('Current env check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlLength: supabaseUrl.length,
        keyLength: supabaseKey.length
      })
      throw new Error(errorMsg)
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('Supabase client initialized with URL:', supabaseUrl.substring(0, 30) + '...')
  }
  return supabaseClient
}

// 导出函数而不是直接导出客户端，避免在模块加载时执行
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof SupabaseClient]
    // 如果是函数，需要绑定this上下文
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

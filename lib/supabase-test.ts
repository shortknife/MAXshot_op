import { supabase } from './supabase'

export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('tasks_op').select('*').limit(1)
    if (error) {
      console.error('Connection test failed:', error)
      return false
    }
    console.log('✅ Supabase connection successful')
    return true
  } catch (err) {
    console.error('Connection test error:', err)
    return false
  }
}

export async function testFoundationMemories(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('agent_memories_op')
      .select('*')
      .eq('type', 'foundation')

    if (error) {
      console.error('Foundation Memories test failed:', error)
      return false
    }

    const count = data?.length || 0
    console.log(`✅ Found ${count} Foundation Memories (expected 4)`)

    if (count !== 4) {
      console.warn(`⚠️  Warning: Expected 4 Foundation Memories, found ${count}`)
      return false
    }

    return true
  } catch (err) {
    console.error('Foundation Memories test error:', err)
    return false
  }
}

export async function runAllTests(): Promise<boolean> {
  console.log('🧪 Starting Supabase tests...\n')

  const connectionOk = await testConnection()
  const memoriesOk = await testFoundationMemories()

  console.log('\n' + '='.repeat(50))
  if (connectionOk && memoriesOk) {
    console.log('✅ All tests passed!')
    return true
  } else {
    console.log('❌ Some tests failed')
    return false
  }
}

if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(err => {
      console.error('Test suite error:', err)
      process.exit(1)
    })
}

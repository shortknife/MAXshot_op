'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { getSessionDefaultEntryPath, getStoredSession, isSurfaceAllowed } from '@/lib/auth'

export function AuthGuard({ children, requiredSurface }: { children: React.ReactNode; requiredSurface?: string }) {
  const router = useRouter()
  const session = typeof window !== 'undefined' ? getStoredSession() : null
  const isAllowed = Boolean(session) && (!requiredSurface || isSurfaceAllowed(session, requiredSurface))

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!session) {
      router.push('/login')
      return
    }
    if (!isAllowed) {
      router.push(getSessionDefaultEntryPath(session))
    }
  }, [isAllowed, router, session])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">验证中...</div>
        </div>
      </div>
    )
  }

  if (!isAllowed) {
    return null
  }

  return <>{children}</>
}

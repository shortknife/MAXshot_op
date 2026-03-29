export interface SessionContext {
  execution_id: string
  user_id?: string
  conversation_history: ConversationMessage[]
  active_task_ids: string[]
  session_start_time: string
  last_activity_time: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

const SESSION_TTL_MS = 30 * 60 * 1000

class SessionManager {
  private sessions: Map<string, SessionContext> = new Map()

  getSession(executionId: string, userId?: string): SessionContext {
    const sessionId = userId ? `${userId}:${executionId}` : executionId

    let session = this.sessions.get(sessionId)

    if (!session) {
      session = this.createNewSession(executionId, userId)
      this.sessions.set(sessionId, session)
    } else {
      session.last_activity_time = new Date().toISOString()

      if (this.isSessionExpired(session)) {
        session = this.createNewSession(executionId, userId)
        this.sessions.set(sessionId, session)
      }
    }

    return session
  }

  private createNewSession(executionId: string, userId?: string): SessionContext {
    return {
      execution_id: executionId,
      user_id: userId,
      conversation_history: [],
      active_task_ids: [],
      session_start_time: new Date().toISOString(),
      last_activity_time: new Date().toISOString(),
    }
  }

  private isSessionExpired(session: SessionContext): boolean {
    const now = new Date().getTime()
    const lastActivity = new Date(session.last_activity_time).getTime()

    return (now - lastActivity) > SESSION_TTL_MS
  }

  addMessageToHistory(sessionId: string, message: ConversationMessage): void {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return
    }

    session.conversation_history.push(message)
    session.last_activity_time = new Date().toISOString()
  }

  setActiveTask(sessionId: string, taskId: string): void {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return
    }

    if (!session.active_task_ids.includes(taskId)) {
      session.active_task_ids.push(taskId)
    }
  }

  getActiveTasks(sessionId: string): string[] {
    const session = this.sessions.get(sessionId)
    return session?.active_task_ids || []
  }

  clearExpiredSessions(): void {
    const now = Date.now()

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId)
      }
    }
  }

  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    return JSON.stringify({
      execution_id: session.execution_id,
      conversation_history: session.conversation_history,
      active_task_ids: session.active_task_ids,
    })
  }

  loadSession(sessionId: string, sessionData: string): SessionContext | null {
    try {
      const parsed = JSON.parse(sessionData) as SessionContext
      this.sessions.set(sessionId, parsed)
      return parsed
    } catch (error) {
      return null
    }
  }
}

const sessionManager = new SessionManager()

export async function loadSessionContext(executionId: string, userId?: string): Promise<SessionContext> {
  return sessionManager.getSession(executionId, userId)
}

export async function saveSessionContext(sessionId: string, context: SessionContext): Promise<void> {
  sessionManager.sessions.set(sessionId, context)
}

export async function addToConversationHistory(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  }

  sessionManager.addMessageToHistory(sessionId, message)
}

export async function getSessionContext(sessionId: string): Promise<string | null> {
  return sessionManager.exportSession(sessionId)
}

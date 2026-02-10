'use client'

import { supabase } from './supabase'

export interface AdminUser {
  email: string
  name: string | null
  role: string
}

const TOKEN_KEY = 'admin_token'
const TOKEN_EXPIRY_HOURS = 24

export function getStoredToken(): { email: string; token: string; timestamp: number } | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem(TOKEN_KEY)
  if (!stored) return null
  
  try {
    const data = JSON.parse(stored)
    const now = Date.now()
    const expiry = data.timestamp + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    
    if (now > expiry) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    
    return data
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export function setStoredToken(email: string, token: string): void {
  if (typeof window === 'undefined') return
  
  const data = {
    email,
    token,
    timestamp: Date.now()
  }
  
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data))
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export async function checkWhitelist(email: string): Promise<AdminUser | null> {
  try {
    console.log('Checking whitelist for email:', email)
    
    const { data, error } = await supabase
      .from('admin_whitelist')
      .select('email, name, role')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error) {
      console.error('Supabase query error:', error)
      // 如果是PGRST116错误（没有找到记录），这是正常的
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    
    if (!data) {
      console.log('No matching record found in whitelist')
      return null
    }
    
    console.log('User found in whitelist:', data)
    return {
      email: data.email,
      name: data.name,
      role: data.role || 'admin'
    }
  } catch (error) {
    console.error('Error checking whitelist:', error)
    return null
  }
}

export async function login(email: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  // 特殊处理：允许 'admin' 作为用户名
  const isSpecialUser = email === 'admin'
  
  // 验证邮箱格式（特殊用户除外）
  if (!isSpecialUser) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' }
    }
  }
  
  // 检查白名单
  const user = await checkWhitelist(email)
  if (!user) {
    console.error('Login failed: User not in whitelist', { email })
    return { success: false, error: 'Email not in whitelist' }
  }
  
  // 生成简单token（实际项目中可以使用JWT）
  const token = `${email}_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  // 存储token
  setStoredToken(email, token)
  
  return { success: true, user }
}

export function isAuthenticated(): boolean {
  return getStoredToken() !== null
}

import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Auth middleware for protected routes
export async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1]
  console.log('🔐 Auth middleware - checking token:', { hasToken: !!accessToken })
  
  if (!accessToken) {
    console.log('❌ No authorization token provided')
    return c.json({ error: 'Authorization token required' }, 401)
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  console.log('🔐 Token validation result:', { 
    hasUser: !!user?.id, 
    userId: user?.id, 
    email: user?.email,
    error: error?.message 
  })
  
  if (error || !user?.id) {
    console.log('❌ Invalid or expired token:', error)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  c.set('userId', user.id)
  c.set('userEmail', user.email)
  c.set('userMetadata', user.user_metadata)
  await next()
}

// Admin middleware
export async function requireAdmin(c: any, next: any) {
  const userId = c.get('userId')
  const userMetadata = c.get('userMetadata')
  
  console.log('👑 Admin middleware - checking admin status:', { 
    userId, 
    role: userMetadata?.role 
  })
  
  // Check if user is admin
  const adminUser = await kv.get('admin:user')
  const isAdmin = adminUser && adminUser.id === userId && userMetadata?.role === 'admin'
  
  console.log('👑 Admin check result:', { 
    hasAdminUser: !!adminUser,
    adminUserId: adminUser?.id,
    currentUserId: userId,
    userRole: userMetadata?.role,
    isAdmin 
  })
  
  if (!isAdmin) {
    console.log('❌ Admin access denied')
    return c.json({ error: 'Admin access required' }, 403)
  }

  await next()
}
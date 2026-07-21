'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function DashboardAuthWrapper({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, email')
          .eq('auth_id', session.user.id)
          .single()

        if (userError || !userData) {
          router.push('/login')
          return
        }

        const role = userData?.role

        if (role === 'admin') {
          router.push('/admin')
          return
        }
        if (role === 'driver') {
          router.push('/driver')
          return
        }
        if (role === 'station') {
          router.push('/station')
          return
        }

        setUser({
          email: session.user.email,
          id: session.user.id
        })
      } catch (error) {
        console.error('Session check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600">Verificando sesión...</span>
        </div>
      </div>
    )
  }

  return (
    <div data-user={user?.id}>
      {children}
    </div>
  )
}

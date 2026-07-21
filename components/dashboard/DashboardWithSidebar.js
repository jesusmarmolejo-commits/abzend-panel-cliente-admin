'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SimpleSidebar from './SimpleSidebar'

export default function DashboardWithSidebar({ children }) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    console.log('DashboardWithSidebar mounted')
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', session.user.id)
          .single()

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

        setIsReady(true)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SimpleSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

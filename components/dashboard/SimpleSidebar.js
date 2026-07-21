'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import AbzendLogo from '@/components/AbzendLogo'
import { createClient } from '@/lib/supabase'
import {
  LogOut,
  Map,
  Home,
  Menu,
  X,
  Car,
  CreditCard,
  Upload,
} from 'lucide-react'

// Panel de ADMINISTRACIÓN del cliente (suscripción / flota / rutas).
// Los servicios (paquetería, transporte, marítimo, aéreo) viven en el otro panel.
const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/suscripcion', icon: CreditCard, label: 'Suscripción' },
  { href: '/dashboard/vehiculos', icon: Car, label: 'Mis vehículos' },
  { href: '/dashboard/rutas', icon: Map, label: 'Rutas' },
  { href: '/dashboard/ubicaciones', icon: Upload, label: 'Ubicaciones' },
]

// Bottom nav items (los más usados en móvil)
const BOTTOM_NAV = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/vehiculos', icon: Car, label: 'Vehículos' },
  { href: '/dashboard/rutas', icon: Map, label: 'Rutas' },
  { href: '/dashboard/suscripcion', icon: CreditCard, label: 'Plan' },
]

export default function SimpleSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen flex-shrink-0">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <AbzendLogo height={28} fallback="ABZEND" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <AbzendLogo height={24} fallback="ABZEND" />
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed top-0 left-0 z-50 w-72 h-full bg-white flex flex-col shadow-xl">
            {/* Drawer header */}
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
              <AbzendLogo height={24} fallback="ABZEND" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive(item.href)
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

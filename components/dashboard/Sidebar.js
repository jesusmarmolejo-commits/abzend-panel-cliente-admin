'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  MapPin,
  BarChart2,
  ChevronDown,
  LogOut,
  Ship,
  Plane,
  Tag,
  Receipt,
  UploadCloud,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  {
    label: 'Mis envíos',
    defaultOpen: true,
    children: [
      { href: '/dashboard/paqueteria', icon: Package, label: 'Paquetería' },
      { href: '/dashboard/terrestre', icon: Truck, label: 'Transporte Terrestre' },
      { href: '/dashboard/maritimo', icon: Ship, label: 'Marítimo LCL/FCL', badge: 'Próximamente', disabled: true },
      { href: '/dashboard/aereo', icon: Plane, label: 'Aéreo', badge: 'Próximamente', disabled: true },
    ],
  },
  { href: '/dashboard/tarifas', icon: Tag, label: 'Tarifas' },
  { href: '/dashboard/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { href: '/dashboard/carga-masiva', icon: UploadCloud, label: 'Carga Masiva' },
  { href: '/dashboard/rastreo', icon: MapPin, label: 'Rastreo' },
  { href: '/dashboard/facturacion', icon: Receipt, label: 'Facturación' },
  { href: '/dashboard/reportes', icon: BarChart2, label: 'Reportes' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openGroups, setOpenGroups] = useState({
    'Mis envíos': true,
  })
  const [userEmail, setUserEmail] = useState('Usuario')

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const renderNavItem = (item) => {
    // Group item with children
    if (item.children) {
      const isOpen = openGroups[item.label];
      return (
        <div key={item.label} className="mb-2">
          <button
            onClick={() => toggleGroup(item.label)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span>{item.label}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isOpen && (
            <div className="ml-2 mt-1 space-y-1">
              {item.children.map((child) => (
                <div key={child.href || child.label}>
                  {child.disabled ? (
                    <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-500 dark:text-gray-500 opacity-40 cursor-not-allowed rounded-lg">
                      <span className="flex items-center gap-2">
                        {child.icon && <child.icon className="w-4 h-4" />}
                        {child.label}
                      </span>
                      {child.badge && (
                        <span
                          className={`text-[10px] px-1.5 rounded whitespace-nowrap ${
                            child.badge === 'Solo MX'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {child.badge}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={child.href}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive(child.href)
                          ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/20 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {child.icon && <child.icon className="w-4 h-4" />}
                        {child.label}
                      </span>
                      {child.badge && (
                        <span
                          className={`text-[10px] px-1.5 rounded whitespace-nowrap ${
                            child.badge === 'Solo MX'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Single nav item
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
          isActive(item.href)
            ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/20 dark:text-indigo-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <item.icon className="w-4 h-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex flex-col w-64 min-w-[256px] h-screen bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">ABZEND</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </nav>

      {/* User Section */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-700">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm text-gray-600 truncate max-w-[120px]">
              {userEmail || 'Usuario'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:
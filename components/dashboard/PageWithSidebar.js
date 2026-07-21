'use client'

import SimpleSidebar from './SimpleSidebar'

export default function PageWithSidebar({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <SimpleSidebar />
      {/* pt-14 en móvil para el top bar, pb-16 para el bottom nav */}
      <div className="flex-1 overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </div>
    </div>
  )
}

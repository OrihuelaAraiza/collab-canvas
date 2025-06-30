import React from 'react'

export const Header = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-[#dbeafe] dark:bg-[#1e293b] border-[#60a5fa] dark:border-[#334155] px-4 md:px-6 z-20 shadow-md">
      <h1 className="text-lg font-bold tracking-tight text-[#1e293b] dark:text-white">
        Collaborative Canvas
      </h1>
      {/* Actions have been moved to HeaderActions component */}
    </header>
  )
} 
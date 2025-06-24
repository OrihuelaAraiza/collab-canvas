import React from 'react'

export const Header = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6 z-20 shadow-md">
      <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
        Collaborative Canvas
      </h1>
      {/* Actions have been moved to HeaderActions component */}
    </header>
  )
} 
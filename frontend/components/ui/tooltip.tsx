'use client'

import * as React from 'react'

type TooltipProps = {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span
      className={`relative inline-flex items-center group ${className ?? ''}`}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  )
}

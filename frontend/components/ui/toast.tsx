'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'success' | 'error' | 'warning' | 'info'

const variantStyles: Record<Variant, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white',
}

interface Toast {
  id: string
  message: string
  variant: Variant
  duration: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, variant?: Variant, duration?: number) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const showToast = (
    message: string,
    variant: Variant = 'info',
    duration = 60000
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, message, variant, duration }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              // cap width to viewport on mobile; use a sane max on larger
              'flex items-start rounded-lg px-4 py-2 shadow-lg min-w-[200px] max-w-[calc(100vw-2rem)] sm:max-w-sm',
              variantStyles[toast.variant]
            )}
          >
            {/* Make text flex-1 and allow it to actually shrink/wrap */}
            <div className="flex-1 min-w-0">
              <span
                className="block text-sm font-medium font-mono break-all whitespace-pre-wrap"
                // overflow-wrap:anywhere is the most forgiving; tailwind's break-words maps to it in newer versions,
                // but add inline style to be extra safe across browsers
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {toast.message}
              </span>
            </div>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="ml-2 p-1 hover:opacity-80 shrink-0"
              aria-label="Close toast"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

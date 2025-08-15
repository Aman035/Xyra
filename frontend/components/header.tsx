'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSolanaWallets } from '@privy-io/react-auth/solana'
import { Button } from '@/components/ui/button'
import { Link2 } from 'lucide-react'
import {
  ALLOWED_EVM_IDS,
  EVM_CHAINS,
  SOLANA_CLUSTER_LABEL,
  labelForChainId,
} from '@/lib/chains'
import { cn } from '@/lib/utils' // if you have it; otherwise use template strings

function shortAddr(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

export default function Header() {
  const pathname = usePathname()
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets: evmWallets } = useWallets()
  const { wallets: solWallets } = useSolanaWallets()

  // --- find the connected wallet across EVM + Solana
  const allWallets = useMemo(() => {
    const evm = (evmWallets as any[]).map((w) => ({
      ...w,
      chainType: 'ethereum',
    }))
    const sol = (solWallets as any[]).map((w) => ({
      ...w,
      chainType: 'solana',
    }))
    return [...evm, ...sol]
  }, [evmWallets, solWallets])

  const connectedWallet = useMemo(() => {
    if (!ready || !authenticated) return undefined
    const addr = user?.wallet?.address?.toLowerCase()
    if (!addr) return undefined
    return allWallets.find((w) => w.address?.toLowerCase() === addr)
  }, [ready, authenticated, user, allWallets])

  const address = connectedWallet?.address ?? ''

  // --- chain label + wrong-network (EVM only)
  const [chainLabel, setChainLabel] = useState<string>('')
  const [wrongNet, setWrongNet] = useState<boolean>(false)

  useEffect(() => {
    if (!ready || !authenticated) return

    if ((connectedWallet as any)?.chainType === 'solana') {
      setChainLabel(SOLANA_CLUSTER_LABEL)
      setWrongNet(false)
      return
    }

    let cleanup: (() => void) | undefined
    ;(async () => {
      const provider = await (connectedWallet as any)?.getEthereumProvider?.()
      if (!provider) return

      const apply = (hex: string) => {
        const id = parseInt(hex, 16)
        setChainLabel(labelForChainId(id))
        setWrongNet(!ALLOWED_EVM_IDS.has(id))
      }

      try {
        const hex = await provider.request({ method: 'eth_chainId' })
        apply(hex)
      } catch {}

      const onChange = (nextHex: string) => apply(nextHex)
      provider.on?.('chainChanged', onChange)
      cleanup = () => provider.removeListener?.('chainChanged', onChange)
    })()

    return () => cleanup?.()
  }, [ready, authenticated, connectedWallet])

  // --- copy with feedback
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!address) return
    await navigator.clipboard?.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 600)
  }

  async function switchTo(chainId: number) {
    try {
      await (connectedWallet as any)?.switchChain?.(chainId)
    } catch (e) {
      console.warn('switch failed', e)
    }
  }

  // active-link helper
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const linkClass = (href: string) =>
    cn?.(
      'transition-colors',
      isActive(href)
        ? 'text-white font-medium'
        : 'text-gray-400 hover:text-white'
    ) ||
    (isActive(href)
      ? 'text-white font-medium'
      : 'text-gray-400 hover:text-white')

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <Link href="/" className="text-xl font-bold text-white">
              Xyra.fi
            </Link>
          </div>

          {/* Nav */}
          <nav className="hidden items-center space-x-8 md:flex">
            <Link href="/supply" className={linkClass('/supply')}>
              Supply
            </Link>
            <Link href="/borrow" className={linkClass('/borrow')}>
              Borrow
            </Link>
            <Link href="/portfolio" className={linkClass('/portfolio')}>
              Portfolio
            </Link>
            <Link href="/markets" className={linkClass('/markets')}>
              Markets
            </Link>
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {!ready ? (
              <Button variant="secondary" disabled>
                Loading…
              </Button>
            ) : !authenticated ? (
              <Button
                className="cursor-pointer border-0 bg-blue-600 text-white hover:bg-blue-700"
                onClick={login}
              >
                Connect Wallet
              </Button>
            ) : (
              <>
                {/* Chain chip (inline) */}
                <div
                  className={[
                    'hidden md:flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                    wrongNet
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                      : 'border-gray-700 text-gray-300',
                  ].join(' ')}
                >
                  <span>{chainLabel || '—'}</span>
                  {wrongNet && (
                    <div className="ml-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2"
                        onClick={() => switchTo(EVM_CHAINS.sepolia.id)}
                      >
                        Switch: {EVM_CHAINS.sepolia.name}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2"
                        onClick={() => switchTo(EVM_CHAINS.baseSepolia.id)}
                      >
                        Switch: {EVM_CHAINS.baseSepolia.name}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Address (copy with feedback) */}
                <Button
                  variant="outline"
                  className="cursor-pointer font-mono"
                  onClick={copy}
                  title="Click to copy address"
                  aria-live="polite"
                >
                  {copied ? 'Copied!' : shortAddr(address) || 'Account'}
                </Button>

                <Button
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={logout}
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

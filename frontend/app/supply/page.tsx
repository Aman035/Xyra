'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { InfoIcon, TrendingUpIcon } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'

import { VAULTS } from '@/lib/vaults'
import { readContract } from '@/lib/viem'
import { formatUnits } from 'viem'
import { CHAIN_ID_TO_CHAIN, CHAINS, VM } from '@/lib/chains'
import { usePrivy, useSolanaWallets, useWallets } from '@privy-io/react-auth'
import { supply } from '@/lib/lendingPool'

const RAY_DECIMALS = 27

type UiRow = {
  symbol: string
  name: string
  logo: string
  tvl: string
  utilizationPct: number | null
  apy: string
  apyPct?: number | null
  zrc20: `0x${string}`
  metadata?: string
  loadingVault: boolean
}

type ChainKey = keyof typeof CHAINS

function pctLabel(n?: number | null, min = 2, max = 2) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n > 0 && n < 0.01) return '<0.01%'
  return `${n.toFixed(Math.min(Math.max(min, 0), Math.max(max, min)))}%`
}

function utilBarClass(u: number | null) {
  if (u == null) return ''
  if (u >= 80) return 'bg-gray-800 [&>div]:bg-red-500'
  if (u >= 50) return 'bg-gray-800 [&>div]:bg-amber-500'
  return 'bg-gray-800 [&>div]:bg-emerald-500'
}

export default function SupplyPage() {
  const { showToast } = useToast()

  // ----------------------------
  // Vault data
  // ----------------------------
  const rowsBase: UiRow[] = useMemo(() => {
    return Object.values(VAULTS).map((v) => ({
      symbol: v.asset.symbol,
      name: v.asset.name,
      logo: v.asset.logo,
      tvl: '—',
      utilizationPct: null,
      apy: '—',
      apyPct: null,
      zrc20: v.zrc20TokenAddress as `0x${string}`,
      metadata: v.metadata,
      loadingVault: true,
    }))
  }, [])

  const [rows, setRows] = useState<UiRow[]>(rowsBase)

  useEffect(() => {
    let cancelled = false

    async function loadVaultData() {
      setRows((prev) => prev.map((r) => ({ ...r, loadingVault: true })))

      const next = await Promise.all(
        rowsBase.map(async (r) => {
          try {
            const decimals = 18

            const totalAssets = await readContract<bigint>({
              functionName: 'getTotalSupplied',
              args: [r.zrc20],
            })
            const tvlNum = Number.parseFloat(formatUnits(totalAssets, decimals))
            const tvlStrNum = tvlNum.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })
            const tvlStr = `${tvlStrNum} ${r.symbol}`

            const utilRay = await readContract<bigint>({
              functionName: '_calculateUtilization',
              args: [r.zrc20],
            })
            const utilPct =
              Number.parseFloat(formatUnits(utilRay, RAY_DECIMALS)) * 100

            const supplyRateRay = await readContract<bigint>({
              functionName: 'getCurrentSupplyRate',
              args: [r.zrc20],
            })
            const apyPct =
              Number.parseFloat(formatUnits(supplyRateRay, RAY_DECIMALS)) * 100
            const apyStr = pctLabel(apyPct)

            return {
              ...r,
              tvl: tvlStr,
              utilizationPct: Number.isFinite(utilPct) ? utilPct : 0,
              apy: apyStr,
              apyPct: Number.isFinite(apyPct) ? apyPct : 0,
              loadingVault: false,
            }
          } catch (err) {
            console.log(err)
            return { ...r, loadingVault: false }
          }
        })
      )

      if (!cancelled) setRows(next)
    }

    loadVaultData()
    return () => {
      cancelled = true
    }
  }, [rowsBase])

  // ----------------------------
  // User & wallet state (Privy)
  // ----------------------------
  const { user } = usePrivy()
  const { wallets: evmWallets } = useWallets()
  const { wallets: solWallets } = useSolanaWallets()

  const currentWallet = useMemo(() => {
    const evm = (evmWallets as any[]).map((w) => ({
      ...w,
      chainType: 'ethereum',
    }))
    const sol = (solWallets as any[]).map((w) => ({
      ...w,
      chainType: 'solana',
    }))
    const all = [...evm, ...sol]
    const addr = user?.wallet?.address?.toLowerCase()
    if (!addr) return undefined
    return all.find((w) => w.address?.toLowerCase?.() === addr)
  }, [evmWallets, solWallets, user?.wallet?.address])

  const currentChain = useMemo(() => {
    if (!currentWallet) return CHAINS.sepolia

    if ((currentWallet as any).chainType === 'solana') {
      return CHAINS.solDevnet // adjust if you support more solana nets
    }

    const raw = String((currentWallet as any).chainId ?? 'eip155:11155111')
    const evmId = raw.includes(':') ? raw.split(':')[1] : raw
    return CHAIN_ID_TO_CHAIN[parseInt(evmId)] ?? CHAINS.sepolia
  }, [currentWallet])

  // Compute the key for the current chain (used to sync select defaults)
  const currentChainKey: ChainKey = useMemo(() => {
    const match = (Object.keys(CHAINS) as ChainKey[]).find(
      (k) => CHAINS[k] === currentChain
    )
    return match ?? 'sepolia'
  }, [currentChain])

  // Tokens allowed on the current chain
  const allowedTokens = useMemo(
    () =>
      currentChain.tokens.map((t) => ({
        symbol: t.asset.symbol,
        chainAddress: t.address,
        zrcAddress: t.zrcTokenAddress,
        logo: (t.asset as any)?.logo ?? '',
      })),
    [currentChain]
  )

  // ----------------------------
  // Form state (user-controlled)
  // ----------------------------
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const selected = rows.find((r) => r.symbol === selectedSymbol) || null

  const [supplyAmount, setSupplyAmount] = useState('')
  const [isSupplying, setIsSupplying] = useState(false)

  // Keep chain as a key, not label (stable)
  const [onBehalfChainKey, setOnBehalfChainKey] = useState<ChainKey>('sepolia')

  // Address defaults to the connected wallet, but user can override
  const [onBehalfAddress, setOnBehalfAddress] = useState<string>('')

  // Sync defaults when upstream values change
  useEffect(() => {
    setOnBehalfChainKey(currentChainKey)
  }, [currentChainKey])

  useEffect(() => {
    setOnBehalfAddress(user?.wallet?.address ?? '')
  }, [user?.wallet?.address])

  // Token select state + clamp when chain (allowedTokens) changes
  const [inputTokenSymbol, setInputTokenSymbol] = useState<string>(
    allowedTokens[0]?.symbol ?? ''
  )

  useEffect(() => {
    if (!allowedTokens.find((t) => t.symbol === inputTokenSymbol)) {
      setInputTokenSymbol(allowedTokens[0]?.symbol ?? '')
    }
  }, [allowedTokens, inputTokenSymbol])

  // ----------------------------
  // Actions
  // ----------------------------
  const disableSubmit =
    !supplyAmount ||
    Number.isNaN(Number.parseFloat(supplyAmount)) ||
    Number.parseFloat(supplyAmount) <= 0 ||
    !selected ||
    !inputTokenSymbol ||
    !onBehalfAddress ||
    !onBehalfChainKey ||
    isSupplying

  const handleSupply = async () => {
    if (
      !selected ||
      !supplyAmount ||
      !inputTokenSymbol ||
      !currentWallet ||
      !onBehalfAddress
    )
      return
    setIsSupplying(true)

    try {
      const txHash = await supply(
        currentWallet,
        selected.zrc20,
        supplyAmount,
        CHAINS[onBehalfChainKey].id,
        onBehalfAddress
      )
      showToast(
        `Token Supplied. Tx: ${txHash}\nThis will take a few seconds to reflect in the Asset Vault`
      )
    } catch (err) {
      console.log(err)
      showToast('Supply Failed', 'error')
    }

    setIsSupplying(false)
    setSupplyAmount('')
    setSelectedSymbol(null)
    setOnBehalfChainKey(currentChainKey)
    setOnBehalfAddress(user?.wallet?.address ?? '')
  }

  // ----------------------------
  // UI helpers
  // ----------------------------
  const DotSpin = () => (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
  )

  const onBehalfVM = CHAINS[onBehalfChainKey].vm
  const addressHint =
    onBehalfVM === VM.EVM ? '0x… (EVM address)' : 'Base58… (Solana address)'

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <main className="container mx-auto px-6 py-8">
      {/* widened container for large screens */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[90rem]">
        <div className="text-center mb-8">
          <h2 className="font-heading text-4xl text-white mb-4">
            Supply & Earn Across Chains
          </h2>
          <p className="text-gray-400 text-lg">
            Supply your crypto assets to unified liquidity pools and earn
            competitive yields across multiple blockchains
          </p>
        </div>

        <Tabs defaultValue="supply" className="w-full">
          <TabsContent value="supply" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Vault list */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">
                      Select Vault to Supply
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rows.map((v) => {
                        const isSelected = selectedSymbol === v.symbol
                        return (
                          <div
                            key={v.symbol}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                            }`}
                            onClick={() => setSelectedSymbol(v.symbol)}
                          >
                            {/* Row 1: Logo + name + APY + TVL */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                  {v.logo ? (
                                    <Image
                                      src={v.logo}
                                      alt={v.name}
                                      width={32}
                                      height={32}
                                    />
                                  ) : (
                                    <span className="text-white text-lg">
                                      {v.symbol}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-white font-bold text-lg">
                                      {v.symbol}
                                    </div>
                                    <Tooltip content={v.metadata}>
                                      <InfoIcon
                                        className="h-3.5 w-3.5 text-gray-400"
                                        tabIndex={0}
                                      />
                                    </Tooltip>
                                  </div>
                                  <div className="text-gray-400">{v.name}</div>
                                </div>
                              </div>

                              {/* APY */}
                              <div className="text-right">
                                <div className="text-green-400 font-bold text-lg">
                                  {v.apy}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Supply APY
                                </div>
                              </div>

                              {/* TVL */}
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {v.loadingVault ? (
                                    <span className="inline-flex items-center gap-2">
                                      <DotSpin />{' '}
                                      <span className="align-middle">—</span>
                                    </span>
                                  ) : (
                                    v.tvl
                                  )}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Vault TVL
                                </div>
                              </div>
                            </div>

                            {/* Row 2: Utilization bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                  Utilization
                                </span>
                                <span className="text-white">
                                  {v.loadingVault || v.utilizationPct === null
                                    ? '—'
                                    : `${v.utilizationPct.toFixed(1)}%`}
                                </span>
                              </div>
                              <Progress
                                className={`mt-1 h-2 ${utilBarClass(
                                  v.utilizationPct
                                )}`}
                                value={
                                  v.utilizationPct === null
                                    ? 0
                                    : Math.max(
                                        0,
                                        Math.min(100, v.utilizationPct)
                                      )
                                }
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Supply Form */}
              <div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">
                      Supply Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selected ? (
                      <div className="space-y-6">
                        {/* Amount + Pay With */}
                        <div>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-300 text-sm font-medium">
                              Amount to Supply
                            </label>
                            <Tooltip content="Smart Lend: provide any supported token on this chain; we swap to the vault asset, then supply.">
                              <InfoIcon className="h-3.5 w-3.5 text-gray-400" />
                            </Tooltip>
                          </div>

                          <div className="mt-2 grid grid-cols-1 lg:grid-cols-5 lg:items-center gap-3">
                            {/* amount */}
                            <div className="relative lg:col-span-3">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={supplyAmount}
                                onChange={(e) =>
                                  setSupplyAmount(e.target.value)
                                }
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-24 h-12"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {inputTokenSymbol || selected.symbol}
                              </div>
                            </div>

                            {/* token selector */}
                            <div className="lg:col-span-2">
                              <select
                                aria-label="Pay with"
                                value={inputTokenSymbol}
                                onChange={(e) =>
                                  setInputTokenSymbol(e.target.value)
                                }
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-12 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {allowedTokens.map((t) => (
                                  <option key={t.symbol} value={t.symbol}>
                                    {t.symbol}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* On behalf of */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 text-sm font-medium">
                                On behalf of
                              </span>
                              <Tooltip content="Advanced: supply for a different address on a specific chain">
                                <InfoIcon className="h-3.5 w-3.5 text-gray-400" />
                              </Tooltip>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-gray-400 text-xs mb-1 block">
                                Chain
                              </label>
                              <select
                                value={onBehalfChainKey}
                                onChange={(e) =>
                                  setOnBehalfChainKey(
                                    e.target.value as ChainKey
                                  )
                                }
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-11 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {(Object.keys(CHAINS) as ChainKey[]).map(
                                  (k) => (
                                    <option key={k} value={k}>
                                      {CHAINS[k].label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-gray-400 text-xs mb-1 block">
                                Address on selected chain
                              </label>
                              <Input
                                placeholder={addressHint}
                                value={onBehalfAddress}
                                onChange={(e) =>
                                  setOnBehalfAddress(e.target.value)
                                }
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleSupply}
                          disabled={disableSubmit}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                        >
                          {isSupplying ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Supplying...</span>
                            </div>
                          ) : (
                            `Supply ${selected.symbol}`
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                          <TrendingUpIcon className="h-8 w-8 text-blue-400" />
                        </div>
                        <p className="text-gray-400">
                          Select a vault to start supplying
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

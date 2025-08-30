'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { TrendingDownIcon, ShieldCheckIcon, InfoIcon } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'

import { VAULTS } from '@/lib/vaults'
import { readContract } from '@/lib/viem'
import { formatUnits, parseUnits } from 'viem'
import {
  CHAIN_ID_TO_CHAIN,
  CHAINS,
  getTokenZrc20Address,
  VM,
} from '@/lib/chains'
import { usePrivy, useSolanaWallets, useWallets } from '@privy-io/react-auth'
import { borrow } from '@/lib/lendingPool'
import { computeUserId } from '@/lib/universalIdentity'

const RAY_DECIMALS = 27
export const HF_DECIMALS = 18 // adjust if your contract scales HF differently
export const BIG_HF = 1e6 // anything above this renders as ∞

type ChainKey = keyof typeof CHAINS

type BorrowRow = {
  symbol: string
  name: string
  logo: string
  zrc20: `0x${string}`
  decimals: number
  borrowApyPct: number | null
  borrowApy: string
  availableNum: number
  available: string
  utilizationPct: number | null
  loading: boolean
}

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

function hfBarClass(hf: number | null) {
  if (hf == null) return 'bg-gray-800 [&>div]:bg-gray-600'
  if (hf === Infinity || hf >= 2) return 'bg-gray-800 [&>div]:bg-emerald-500'
  if (hf >= 1.5) return 'bg-gray-800 [&>div]:bg-amber-500'
  return 'bg-gray-800 [&>div]:bg-red-500'
}

export default function BorrowPage() {
  const { showToast } = useToast()

  // ----------------------------
  // Base rows from VAULTS (static)
  // ----------------------------
  const rowsBase: BorrowRow[] = useMemo(() => {
    return Object.values(VAULTS).map((v) => {
      const symbol = v.asset.symbol

      return {
        symbol,
        name: v.asset.name,
        logo: v.asset.logo,
        zrc20: v.zrc20TokenAddress as `0x${string}`,
        decimals: v.asset.decimals,
        borrowApyPct: null,
        borrowApy: '—',
        availableNum: 0,
        available: '—',
        utilizationPct: null,
        loading: true,
      }
    })
  }, [])

  const [rows, setRows] = useState<BorrowRow[]>(rowsBase)

  // ----------------------------
  // Load on-chain data for rows
  // ----------------------------
  useEffect(() => {
    let cancelled = false

    async function loadBorrowData() {
      setRows((prev) => prev.map((r) => ({ ...r, loading: true })))

      const next = await Promise.all(
        rowsBase.map(async (r) => {
          try {
            const decimals = 18 // adjust per-asset if needed

            const totalSupplied = await readContract<bigint>({
              functionName: 'getTotalSupplied',
              args: [r.zrc20],
            })
            const totalBorrowed = await readContract<bigint>({
              functionName: 'getTotalBorrowed',
              args: [r.zrc20],
            })

            const supplied = Number.parseFloat(
              formatUnits(totalSupplied, decimals)
            )
            const borrowed = Number.parseFloat(
              formatUnits(totalBorrowed, decimals)
            )
            const availableNum = Math.max(0, supplied - borrowed)
            const availableStr = `${availableNum.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })} ${r.symbol}`

            // utilization = borrowed/supplied
            const utilPct =
              supplied > 0
                ? Math.min(100, Math.max(0, (borrowed / supplied) * 100))
                : 0

            // borrow APY (RAY → %)
            const borrowRateRay = await readContract<bigint>({
              functionName: 'getCurrentBorrowRate',
              args: [r.zrc20],
            })
            const borrowApyPct =
              Number.parseFloat(formatUnits(borrowRateRay, RAY_DECIMALS)) * 100
            const borrowApy = pctLabel(borrowApyPct)

            return {
              ...r,
              borrowApyPct: Number.isFinite(borrowApyPct) ? borrowApyPct : 0,
              borrowApy,
              availableNum,
              available: availableStr,
              utilizationPct: Number.isFinite(utilPct) ? utilPct : 0,
              loading: false,
            }
          } catch (e) {
            console.log('borrow row error', r.symbol, e)
            return { ...r, loading: false }
          }
        })
      )

      if (!cancelled) setRows(next)
    }

    loadBorrowData()
    return () => {
      cancelled = true
    }
  }, [rowsBase])

  // ----------------------------
  // User & wallet state (Privy) — mirror SupplyPage
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

  const currentChainKey: ChainKey = useMemo(() => {
    const match = (Object.keys(CHAINS) as ChainKey[]).find(
      (k) => CHAINS[k] === currentChain
    )
    return match ?? 'sepolia'
  }, [currentChain])

  // ----------------------------
  // Health Factor — get from contract using universal identity bytes
  // ----------------------------
  const [healthFactor, setHealthFactor] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchHF() {
      try {
        if (!currentWallet?.address) {
          if (mounted) setHealthFactor(null)
          return
        }

        const userIdHex = computeUserId(
          currentWallet.chainId.split(':')[1],
          currentWallet.address
        )
        if (!userIdHex) {
          if (mounted) setHealthFactor(null)
          return
        }

        const hfRaw = await readContract<bigint>({
          functionName: 'getHealthFactor',
          args: [userIdHex],
        })

        const parsed = Number.parseFloat(formatUnits(hfRaw, HF_DECIMALS))

        let hfForUi: number | null = Number.isFinite(parsed) ? parsed : null
        if (hfForUi !== null && hfForUi <= 0) hfForUi = null // no position
        if (hfForUi !== null && hfForUi > BIG_HF) hfForUi = Infinity // show ∞

        if (mounted) setHealthFactor(hfForUi)
      } catch (e) {
        console.log('getHealthFactor error', e)
        if (mounted) setHealthFactor(null)
      }
    }

    fetchHF()
    return () => {
      mounted = false
    }
  }, [currentWallet?.address, currentWallet])

  const getHealthFactorColor = (factor: number | null) => {
    if (factor == null) return 'text-gray-400'
    if (factor >= 2) return 'text-green-400'
    if (factor >= 1.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  // ----------------------------
  // Selection + form state
  // ----------------------------
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const selected = rows.find((r) => r.symbol === selectedSymbol) || null

  const [borrowAmount, setBorrowAmount] = useState<string>('')
  const [isBorrowing, setIsBorrowing] = useState<boolean>(false)

  const [sendChainKey, setSendChainKey] = useState<ChainKey>(currentChainKey)
  const isZetaAthensDest = sendChainKey === 'zetaAthens'

  useEffect(() => {
    setSendChainKey(currentChainKey)
  }, [currentChainKey])

  // receive token options on selected chain
  const receiveTokens = useMemo(() => {
    return CHAINS[sendChainKey].tokens.map((t) => t.asset.symbol)
  }, [sendChainKey])

  const [receiveTokenSymbol, setReceiveTokenSymbol] = useState<string>(
    receiveTokens[0] || ''
  )
  useEffect(() => {
    if (isZetaAthensDest && selected?.symbol) {
      setReceiveTokenSymbol(selected.symbol)
      return
    }
    const target = selected?.symbol
    const hasSame = target && receiveTokens.includes(target as any)
    setReceiveTokenSymbol(hasSame ? (target as string) : receiveTokens[0] || '')
  }, [receiveTokens, selected?.symbol, isZetaAthensDest])

  const [sendAddress, setSendAddress] = useState('')

  useEffect(() => {
    setSendAddress(user?.wallet?.address ?? '')
  }, [user])

  const setMax = () => {
    if (!selected) return
    setBorrowAmount(String(selected.availableNum))
  }

  const disableSubmit =
    !borrowAmount ||
    Number.isNaN(Number.parseFloat(borrowAmount)) ||
    Number.parseFloat(borrowAmount) <= 0 ||
    !selected ||
    !sendChainKey ||
    sendAddress.trim() === '' ||
    (selected && Number.parseFloat(borrowAmount) > selected.availableNum) ||
    isBorrowing

  // ----------------------------
  // Actions
  // ----------------------------
  const handleBorrow = async () => {
    const tokenToBeReceived = getTokenZrc20Address(
      sendChainKey,
      receiveTokenSymbol
    )

    if (!selected || !borrowAmount || !tokenToBeReceived) return

    try {
      setIsBorrowing(true)

      // If you have a `borrow` function available, call it here. Example:
      const receipt = await borrow(
        currentWallet,
        selected.zrc20,
        parseUnits(borrowAmount, selected.decimals),
        tokenToBeReceived,
        sendAddress,
        CHAINS[sendChainKey].id
      )
      showToast(
        `Token Borrow Requested. Tx: ${receipt.transactionHash}\nThis will take a few seconds to reflect`
      )

      setBorrowAmount('')
      setSelectedSymbol(null)
      setSendChainKey(currentChainKey)
      setSendAddress(user?.wallet?.address ?? '')
    } catch (e) {
      console.log('borrow failed', e)
      showToast('Borrow Failed', 'error')
    } finally {
      setIsBorrowing(false)
    }
  }

  const onBehalfVM = CHAINS[sendChainKey].vm
  const addressHint =
    onBehalfVM === VM.EVM ? '0x… (EVM address)' : 'Base58… (Solana address)'

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <main className="container mx-auto px-6 py-8">
      <div className="mx-auto max-w-7xl 2xl:max-w-[90rem]">
        <div className="text-center mb-8">
          <h2 className="font-heading text-4xl text-white mb-4">
            Borrow Across Chains
          </h2>
          <p className="text-gray-400 text-lg">
            Use your supplied assets as collateral to borrow from unified
            liquidity pools across multiple blockchains
          </p>
        </div>

        {/* Health Factor */}
        <Card className="mb-6 bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <ShieldCheckIcon
                  className={`h-6 w-6 ${getHealthFactorColor(healthFactor)}`}
                />
                <div>
                  <div className="text-white font-medium">Health Factor</div>
                  <div className="text-gray-400 text-sm">
                    Cross-chain liquidation risk indicator
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${getHealthFactorColor(
                    healthFactor
                  )}`}
                >
                  {healthFactor == null
                    ? '—'
                    : healthFactor === Infinity
                    ? '∞'
                    : healthFactor.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">
                  {healthFactor == null
                    ? 'Connect to view'
                    : healthFactor >= 2 || healthFactor === Infinity
                    ? 'Safe'
                    : healthFactor >= 1.5
                    ? 'Moderate Risk'
                    : 'High Risk'}
                </div>
              </div>
            </div>
            <Progress
              value={
                healthFactor == null
                  ? 0
                  : Math.min((healthFactor / 3) * 100, 100)
              }
              className={`mt-3 h-2 ${hfBarClass(healthFactor)}`}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="borrow" className="w-full">
          <TabsContent value="borrow" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Asset Selection */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">
                      Select Asset to Borrow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rows.map((asset) => {
                        const isSelected = selectedSymbol === asset.symbol
                        return (
                          <div
                            key={asset.symbol}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                            }`}
                            onClick={() => setSelectedSymbol(asset.symbol)}
                          >
                            <div className="flex items-center justify-between">
                              {/* Left: logo + symbol + name + chains */}
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                  {asset.logo ? (
                                    <Image
                                      src={asset.logo}
                                      alt={asset.name}
                                      width={32}
                                      height={32}
                                    />
                                  ) : (
                                    <span className="text-white text-lg">
                                      {asset.symbol}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white font-bold text-lg">
                                    {asset.symbol}
                                  </div>
                                  <div className="text-gray-400">
                                    {asset.name}
                                  </div>
                                </div>
                              </div>

                              {/* Borrow APY */}
                              <div className="text-right">
                                <div className="text-red-400 font-bold text-lg">
                                  {asset.borrowApy}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Borrow APY
                                </div>
                              </div>

                              {/* Available */}
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {asset.loading ? '—' : asset.available}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Available
                                </div>
                              </div>
                            </div>

                            {/* Utilization bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                  Utilization
                                </span>
                                <span className="text-white">
                                  {asset.loading || asset.utilizationPct == null
                                    ? '—'
                                    : `${asset.utilizationPct.toFixed(1)}%`}
                                </span>
                              </div>
                              <Progress
                                className={`mt-1 h-2 ${utilBarClass(
                                  asset.utilizationPct
                                )}`}
                                value={
                                  asset.utilizationPct == null
                                    ? 0
                                    : Math.max(
                                        0,
                                        Math.min(100, asset.utilizationPct)
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

              {/* Borrow Form */}
              <div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">
                      Smart Borrow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selected ? (
                      <div className="space-y-6">
                        {/* Amount + Receive as (60/40 on lg+) */}
                        <div>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-300 text-sm font-medium">
                              Amount to Borrow
                            </label>
                            <Tooltip content="Borrow from this vault. Optionally send to another chain and receive as a different token, we take care of all the swaps required.">
                              <InfoIcon className="h-3.5 w-3.5 text-gray-400" />
                            </Tooltip>
                          </div>

                          <div className="mt-2 grid grid-cols-1 lg:grid-cols-5 lg:items-center gap-3">
                            {/* 60% amount */}
                            <div className="relative lg:col-span-3">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={borrowAmount}
                                onChange={(e) =>
                                  setBorrowAmount(e.target.value)
                                }
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-24 h-12"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {selected.symbol}
                              </div>
                            </div>

                            {/* 40% receive token (only matters if cross-chain) */}
                            <div className="lg:col-span-2">
                              <select
                                aria-label="Receive as"
                                value={receiveTokenSymbol}
                                onChange={(e) =>
                                  setReceiveTokenSymbol(e.target.value)
                                }
                                disabled={isZetaAthensDest}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-12 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70"
                              >
                                {isZetaAthensDest && selected ? (
                                  <option value={selected.symbol}>
                                    Receive as {selected.symbol}
                                  </option>
                                ) : (
                                  receiveTokens.map((s) => (
                                    <option key={s} value={s}>
                                      Receive as {s}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-between mt-2">
                            <span className="text-gray-400 text-sm">
                              Max available: {selected.available}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                              onClick={setMax}
                            >
                              MAX
                            </Button>
                          </div>
                        </div>

                        {/* Send to (advanced) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 text-sm font-medium">
                                Send to
                              </span>
                              <Tooltip content="Advanced: send borrowed funds to another chain/address. If cross-chain, they can be swapped to the selected token before withdrawal.">
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
                                value={sendChainKey}
                                onChange={(e) =>
                                  setSendChainKey(e.target.value as ChainKey)
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
                                value={sendAddress}
                                onChange={(e) => setSendAddress(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleBorrow}
                          disabled={disableSubmit}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                        >
                          {isBorrowing ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Borrowing...</span>
                            </div>
                          ) : (
                            `Borrow ${selected.symbol}`
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                          <TrendingDownIcon className="h-8 w-8 text-blue-400" />
                        </div>
                        <p className="text-gray-400">
                          Select an asset to start borrowing
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

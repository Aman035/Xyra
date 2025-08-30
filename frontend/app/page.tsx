'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatUnits } from 'viem'
import { HexAddr, readContract } from '@/lib/viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  Link2,
} from 'lucide-react'
import Image from 'next/image'
import { VAULTS } from '@/lib/vaults'
import { PRICE_ORACLE_ABI } from '../lib/abis'

// ----------------------------
// Constants
// ----------------------------
const RAY_DECIMALS = 27
export const TOTAL_ACTIVE_CHAINS = 4

// ----------------------------
// Types
// ----------------------------
type Row = {
  symbol: string
  name: string
  logo: string
  zrc20: `0x${string}`
  borrowApyPct: number | null
  borrowApy: string
  supplyApyPct: number | null
  supplyApy: string
  borrowedNum: number
  borrowed: string
  utilizationPct: number | null
  loading: boolean
  tvl: string
}

// ----------------------------
// Helper
// ----------------------------
function pctLabel(pct: number | null) {
  if (pct == null) return '—'
  return `${pct.toFixed(2)}%`
}

// ----------------------------
// Dashboard Component
// ----------------------------
export default function Dashboard() {
  const rowsBase: Row[] = useMemo(() => {
    return Object.values(VAULTS).map((v) => {
      const symbol = v.asset.symbol
      return {
        symbol,
        name: v.asset.name,
        logo: v.asset.logo,
        tvl: '—',
        zrc20: v.zrc20TokenAddress,
        borrowApyPct: null,
        borrowApy: '—',
        supplyApyPct: null,
        supplyApy: '—',
        borrowedNum: 0,
        borrowed: '—',
        utilizationPct: null,
        loading: true,
      }
    })
  }, [])

  const [rows, setRows] = useState<Row[]>(rowsBase)
  const [tvlUsd, setTvlUsd] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const DotSpin = () => (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
  )

  // ----------------------------
  // Load on-chain data
  // ----------------------------
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setRows((prev) => prev.map((r) => ({ ...r, loading: true })))
      setIsLoading(true)
      let totalUsd = 0

      const next = await Promise.all(
        rowsBase.map(async (r) => {
          try {
            const decimals = 18

            const totalSupplied = await readContract<bigint>({
              functionName: 'getTotalSupplied',
              args: [r.zrc20],
            })
            const totalBorrowed = await readContract<bigint>({
              functionName: 'getTotalBorrowed',
              args: [r.zrc20],
            })
            // Get asset price in USD (18 decimals)
            const priceUsd = await readContract<bigint>({
              address: process.env.NEXT_PUBLIC_PRICE_ORACLE as HexAddr,
              functionName: 'getAssetPrice',
              abi: PRICE_ORACLE_ABI,
              args: [r.zrc20],
            })

            // Convert price: 18 decimals → normal number
            const price = Number.parseFloat(formatUnits(priceUsd, 18))

            const tvlNum = Number.parseFloat(formatUnits(totalSupplied, decimals))
            const tvlStrNum = tvlNum.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })
            const tvlStr = `${tvlStrNum} ${r.symbol}`

            const supplied = Number.parseFloat(
              formatUnits(totalSupplied, decimals)
            )
            const borrowed = Number.parseFloat(
              formatUnits(totalBorrowed, decimals)
            )
            const availableNum = borrowed
            const availableStr = `${availableNum.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })} ${r.symbol}`

            // Supplied value in USD
            const suppliedUsd = supplied * price
            totalUsd += suppliedUsd

            const utilPct =
              supplied > 0 ? Math.min(100, (borrowed / supplied) * 100) : 0

            const borrowRateRay = await readContract<bigint>({
              functionName: 'getCurrentBorrowRate',
              args: [r.zrc20],
            })
            const borrowApyPct =
              Number.parseFloat(formatUnits(borrowRateRay, RAY_DECIMALS)) * 100
            const borrowApy = pctLabel(borrowApyPct)

            const supplyRateRay = await readContract<bigint>({
              functionName: 'getCurrentSupplyRate',
              args: [r.zrc20],
            })
            const supplyApyPct =
              Number.parseFloat(formatUnits(supplyRateRay, RAY_DECIMALS)) * 100
            const supplyApy = pctLabel(supplyApyPct)

            setIsLoading(false)

            return {
              ...r,
              borrowApyPct: Number.isFinite(borrowApyPct) ? borrowApyPct : 0,
              borrowApy,
              supplyApyPct: Number.isFinite(supplyApyPct) ? supplyApyPct : 0,
              supplyApy,
              tvl: tvlStr,
              borrowedNum: availableNum,
              borrowed: availableStr,
              utilizationPct: utilPct,
              loading: false,
            }
          } catch (e) {
            console.error('market row error', r.symbol, e)
            setIsLoading(false)
            return { ...r, loading: false }
          }
        })
      )

      if (!cancelled) {
        setRows(next)
        setTvlUsd(totalUsd)
        setIsLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [rowsBase])

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-blue-400 mr-3" />
          <span className="text-blue-400 font-medium">
            Universal Lending Protocol
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-serif">
          Unified Liquidity
          <span className="text-blue-400"> Across All Chains</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Lend and borrow seamlessly across Ethereum, Base, Solana, Zeta and
          more. One protocol, infinite possibilities.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/supply">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              Start Lending
              <ArrowUpRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/borrow">
            <Button
              size="lg"
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800 bg-transparent"
            >
              Borrow Assets
              <ArrowDownRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Cross-Chain Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Example: TVL = sum of supplied across all rows */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Value Locked
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="text-2xl font-bold text-white font-serif">
                  <DotSpin />{' '}
                </div>
              ) : (
                <div className="text-2xl font-bold text-white font-serif">
                  ${tvlUsd.toFixed(2)}
                </div>
              )}
            <p className="text-xs text-green-400">
              Across {TOTAL_ACTIVE_CHAINS} chains
            </p>
          </CardContent>
        </Card>

        {/* Active Chains */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Chains
            </CardTitle>
            <Globe className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-serif">
              {TOTAL_ACTIVE_CHAINS}
            </div>
            <p className="text-xs text-blue-400">Networks connected</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400">
              Best APY
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
              {isLoading ? (
                <div className="text-2xl font-bold text-white font-serif">
                  <DotSpin />{' '}
                </div>
              ) : (
                <div className="text-2xl font-bold text-white font-serif">
                  {pctLabel(
                    Math.max(...rows.map((r) => r.supplyApyPct ?? 0))
                  )}
                </div>
              )}
            <p className="text-xs text-yellow-400">Optimized rates</p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Chain Markets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Supply Markets */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white font-serif flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-400" />
              Cross-Chain Supply Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((market) => (
              <div
                key={market.symbol}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {market.logo ? (
                        <Image
                          src={market.logo}
                          alt={market.name}
                          width={16}
                          height={16}
                        />
                      ) : (
                        <span className="text-white text-lg">
                          {market.symbol}
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-white font-medium">
                      {market.symbol}
                    </span>
                    <div className="text-gray-400 text-xs">Total Supplied</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-medium">
                    {market.loading ? (
                      <span className="inline-flex items-center gap-2">
                        <DotSpin />{' '}
                      </span>
                    ) : (
                      market.supplyApy
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {market.loading ? (
                      <span className="inline-flex items-center gap-2">
                        <DotSpin />{' '}
                      </span>
                    ) : (
                      market.tvl
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Borrow Markets */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white font-serif flex items-center">
              <Link2 className="w-5 h-5 mr-2 text-cyan-400" />
              Unified Borrow Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((market) => (
              <div
                key={market.symbol}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {market.logo ? (
                        <Image
                          src={market.logo}
                          alt={market.name}
                          width={16}
                          height={16}
                        />
                      ) : (
                        <span className="text-white text-lg">
                          {market.symbol}
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-white font-medium">
                      {market.symbol}
                    </span>
                    <div className="text-gray-400 text-xs">Total Borrowed</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-medium">
                    {market.loading ? (
                      <span className="inline-flex items-center gap-2">
                        <DotSpin />{' '}
                      </span>
                    ) : (
                      market.borrowApy
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {market.loading ? (
                      <span className="inline-flex items-center gap-2">
                        <DotSpin />{' '}
                      </span>
                    ) : (
                      market.borrowed
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

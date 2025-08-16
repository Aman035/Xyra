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

import { VAULTS } from '@/lib/vaults'
import { ERC20_ABI } from '@/lib/abis'
import { readZetaContract } from '@/lib/zeta'
import { formatUnits } from 'viem'

const RAY_DECIMALS = 27 // contract uses 1e27 scale

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

function pctLabel(n?: number | null, min = 2, max = 2) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n > 0 && n < 0.01) return '<0.01%'
  return `${n.toFixed(Math.min(Math.max(min, 0), Math.max(max, min)))}%`
}

export default function SupplyPage() {
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
            // 1) token decimals
            // const decimals = await readZetaContract<number>({
            //   address: r.zrc20,
            //   functionName: 'decimals',
            //   abi: ERC20_ABI,
            // })
            const decimals = 18

            // 2) TVL (underlying)
            const totalAssets = await readZetaContract<bigint>({
              functionName: 'getTotalSupplied',
              args: [r.zrc20],
            })
            const tvlNum = Number.parseFloat(formatUnits(totalAssets, decimals))
            const tvlStr = tvlNum.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })

            // 3) Utilization in RAY → %
            const utilRay = await readZetaContract<bigint>({
              functionName: '_calculateUtilization',
              args: [r.zrc20],
            })
            const utilPct =
              Number.parseFloat(formatUnits(utilRay, RAY_DECIMALS)) * 100

            // 4) Supply rate in RAY/year → APY %
            const supplyRateRay = await readZetaContract<bigint>({
              functionName: 'getCurrentSupplyRate',
              args: [r.zrc20],
            })
            const apyPct =
              Number.parseFloat(formatUnits(supplyRateRay, RAY_DECIMALS)) * 100
            const apyStr = pctLabel(apyPct)

            // // Debug (optional)
            // console.log({
            //   symbol: r.symbol,
            //   tvlNum,
            //   utilRay: utilRay.toString(),
            //   supplyRateRay: supplyRateRay.toString(),
            //   utilPct,
            //   apyPct,
            // })

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

  /** Form state */
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const selected = rows.find((r) => r.symbol === selectedSymbol) || null
  const [supplyAmount, setSupplyAmount] = useState('')
  const [isSupplying, setIsSupplying] = useState(false)

  const disableSubmit =
    !supplyAmount ||
    Number.isNaN(Number.parseFloat(supplyAmount)) ||
    Number.parseFloat(supplyAmount) <= 0 ||
    isSupplying

  // simple daily earnings estimate from APR (APY) for UX
  const calculateEarnings = () => {
    if (!selected || !selected.apyPct) return '0.00'
    const amt = Number.parseFloat(supplyAmount || '0')
    if (!Number.isFinite(amt) || amt <= 0) return '0.00'
    const apr = selected.apyPct / 100
    const daily = (amt * apr) / 365
    return daily.toLocaleString(undefined, { maximumFractionDigits: 6 })
  }

  const handleSupply = async () => {
    if (!selected || !supplyAmount) return
    setIsSupplying(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsSupplying(false)
    setSupplyAmount('')
    setSelectedSymbol(null)
  }

  const DotSpin = () => (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
  )

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
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
                                className="mt-1 h-2"
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
                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">
                            Amount to Supply
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={supplyAmount}
                              onChange={(e) => setSupplyAmount(e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-20"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                              {selected.symbol}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-lg bg-gray-800">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Supply APY</span>
                            <span className="text-green-400 font-bold">
                              {selected.apy}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">
                              Estimated Daily Earnings
                            </span>
                            <span className="text-white">
                              ~{calculateEarnings()} {selected.symbol}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Utilization</span>
                            <span className="text-white">
                              {selected.utilizationPct === null
                                ? '—'
                                : `${selected.utilizationPct.toFixed(1)}%`}
                            </span>
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

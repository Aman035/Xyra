"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeftIcon, AlertTriangleIcon, TrendingDownIcon, ShieldCheckIcon, GlobeIcon } from "lucide-react"
import Link from "next/link"

const BORROW_ASSETS = [
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💰",
    borrowApy: "5.25%",
    available: "890000000",
    price: "$1.00",
    borrowed: "0.00",
    maxBorrow: "425.00",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "⟠",
    borrowApy: "4.85%",
    available: "380000",
    price: "$2,340.50",
    borrowed: "0.00",
    maxBorrow: "1.82",
    chains: ["Ethereum", "Arbitrum", "Optimism"],
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    icon: "₿",
    borrowApy: "3.95%",
    available: "5600",
    price: "$43,250.00",
    borrowed: "0.00",
    maxBorrow: "0.098",
    chains: ["Ethereum", "Polygon"],
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    icon: "◈",
    borrowApy: "5.15%",
    available: "180000000",
    price: "$1.00",
    borrowed: "0.00",
    maxBorrow: "425.00",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
]

const COLLATERAL_ASSETS = [
  { symbol: "USDC", supplied: "500.00", value: "$500.00", ltv: "85%", chains: 3 },
  { symbol: "ETH", supplied: "1.25", value: "$2,925.63", ltv: "80%", chains: 3 },
]

export default function BorrowPage() {
  const [selectedAsset, setSelectedAsset] = useState<(typeof BORROW_ASSETS)[0] | null>(null)
  const [borrowAmount, setBorrowAmount] = useState("")
  const [isBorrowing, setIsBorrowing] = useState(false)
  const [healthFactor, setHealthFactor] = useState(2.65)

  const handleBorrow = async () => {
    if (!selectedAsset || !borrowAmount) return

    setIsBorrowing(true)
    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsBorrowing(false)
    setBorrowAmount("")
    setSelectedAsset(null)
  }

  const calculateNewHealthFactor = () => {
    if (!selectedAsset || !borrowAmount) return healthFactor
    const amount = Number.parseFloat(borrowAmount)
    const borrowValue = amount * Number.parseFloat(selectedAsset.price.replace("$", "").replace(",", ""))
    const totalCollateral = 3425.63 // Mock total collateral value
    const currentBorrowValue = 3100 // Mock current borrow value
    const newBorrowValue = currentBorrowValue + borrowValue
    return ((totalCollateral * 0.8) / newBorrowValue).toFixed(2)
  }

  const calculateInterestCost = () => {
    if (!selectedAsset || !borrowAmount) return "0.00"
    const amount = Number.parseFloat(borrowAmount)
    const apy = Number.parseFloat(selectedAsset.borrowApy.replace("%", "")) / 100
    return ((amount * apy) / 365).toFixed(6)
  }

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2) return "text-green-400"
    if (factor >= 1.5) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <GlobeIcon className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-heading text-2xl text-white">Xyra.fi - Borrow Assets</h1>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Connected</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl text-white mb-4">Borrow Across Chains</h2>
            <p className="text-gray-400 text-lg">
              Use your supplied assets as collateral to borrow from unified liquidity pools across multiple blockchains
            </p>
          </div>

          {/* Health Factor Alert */}
          <Card className="mb-6 bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ShieldCheckIcon className={`h-6 w-6 ${getHealthFactorColor(healthFactor)}`} />
                  <div>
                    <div className="text-white font-medium">Health Factor</div>
                    <div className="text-gray-400 text-sm">Cross-chain liquidation risk indicator</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getHealthFactorColor(healthFactor)}`}>{healthFactor}</div>
                  <div className="text-gray-400 text-sm">
                    {healthFactor >= 2 ? "Safe" : healthFactor >= 1.5 ? "Moderate Risk" : "High Risk"}
                  </div>
                </div>
              </div>
              <Progress value={Math.min((healthFactor / 3) * 100, 100)} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Tabs defaultValue="borrow" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="borrow"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Borrow Assets
              </TabsTrigger>
              <TabsTrigger
                value="collateral"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Your Collateral
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Borrow Positions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="borrow" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Asset Selection */}
                <div className="lg:col-span-2">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading">Select Asset to Borrow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {BORROW_ASSETS.map((asset) => (
                          <div
                            key={asset.symbol}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedAsset?.symbol === asset.symbol
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                            }`}
                            onClick={() => setSelectedAsset(asset)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white text-lg">
                                  {asset.icon}
                                </div>
                                <div>
                                  <div className="text-white font-bold text-lg">{asset.symbol}</div>
                                  <div className="text-gray-400">{asset.name}</div>
                                  <div className="flex items-center space-x-1 mt-1">
                                    <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                    <span className="text-xs text-cyan-400">{asset.chains.length} chains</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-red-400 font-bold text-lg">{asset.borrowApy}</div>
                                <div className="text-gray-400 text-sm">Borrow APY</div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {asset.maxBorrow} {asset.symbol}
                                </div>
                                <div className="text-gray-400 text-sm">Max Borrow</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Borrow Form */}
                <div>
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading">Borrow Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAsset ? (
                        <div className="space-y-6">
                          <div>
                            <label className="text-gray-300 text-sm font-medium mb-2 block">Amount to Borrow</label>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={borrowAmount}
                                onChange={(e) => setBorrowAmount(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-20"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {selectedAsset.symbol}
                              </div>
                            </div>
                            <div className="flex justify-between mt-2">
                              <span className="text-gray-400 text-sm">
                                Max: {selectedAsset.maxBorrow} {selectedAsset.symbol}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                                onClick={() => setBorrowAmount(selectedAsset.maxBorrow)}
                              >
                                MAX
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3 p-4 rounded-lg bg-gray-800">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Borrow APY</span>
                              <span className="text-red-400 font-bold">{selectedAsset.borrowApy}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Daily Interest</span>
                              <span className="text-white">
                                ~{calculateInterestCost()} {selectedAsset.symbol}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Available Chains</span>
                              <span className="text-cyan-400">{selectedAsset.chains.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">New Health Factor</span>
                              <span className={getHealthFactorColor(Number.parseFloat(calculateNewHealthFactor()))}>
                                {calculateNewHealthFactor()}
                              </span>
                            </div>
                          </div>

                          {Number.parseFloat(calculateNewHealthFactor()) < 1.5 && borrowAmount && (
                            <div className="flex items-start space-x-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <AlertTriangleIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="text-red-200 text-sm">
                                Warning: This borrow amount will put your cross-chain position at risk of liquidation.
                                Consider borrowing less or adding more collateral.
                              </div>
                            </div>
                          )}

                          <div className="flex items-start space-x-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <AlertTriangleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-blue-200 text-sm">
                              Borrowed assets are automatically sourced from the best available rates across multiple
                              chains. Interest accrues over time.
                            </div>
                          </div>

                          <Button
                            onClick={handleBorrow}
                            disabled={
                              !borrowAmount ||
                              Number.parseFloat(borrowAmount) <= 0 ||
                              Number.parseFloat(calculateNewHealthFactor()) < 1.1 ||
                              isBorrowing
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                          >
                            {isBorrowing ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Borrowing...</span>
                              </div>
                            ) : (
                              `Borrow ${selectedAsset.symbol}`
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                            <TrendingDownIcon className="h-8 w-8 text-blue-400" />
                          </div>
                          <p className="text-gray-400">Select an asset to start borrowing</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collateral" className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-heading">Your Cross-Chain Collateral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {COLLATERAL_ASSETS.map((asset) => (
                      <div key={asset.symbol} className="p-4 rounded-lg bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                              {asset.symbol === "USDC" ? "💰" : "⟠"}
                            </div>
                            <div>
                              <div className="text-white font-bold">{asset.symbol}</div>
                              <div className="text-gray-400 text-sm">Loan-to-Value: {asset.ltv}</div>
                              <div className="flex items-center space-x-1 mt-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">{asset.chains} chains</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-bold">
                              {asset.supplied} {asset.symbol}
                            </div>
                            <div className="text-gray-400 text-sm">{asset.value}</div>
                          </div>
                          <Badge className="bg-green-600 text-white">Active</Badge>
                        </div>
                      </div>
                    ))}

                    <div className="text-center py-4 border-t border-gray-800">
                      <div className="text-gray-300 text-sm mb-2">Total Cross-Chain Collateral Value</div>
                      <div className="text-white font-bold text-2xl">$3,425.63</div>
                      <div className="text-gray-400 text-sm">Available to Borrow: $2,740.50</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="positions" className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-heading">Your Borrow Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mock borrow positions */}
                    <div className="p-4 rounded-lg bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                            💰
                          </div>
                          <div>
                            <div className="text-white font-bold">USDC</div>
                            <div className="text-gray-400 text-sm">Borrowed 20 days ago</div>
                            <div className="flex items-center space-x-1 mt-1">
                              <GlobeIcon className="h-3 w-3 text-cyan-400" />
                              <span className="text-xs text-cyan-400">3 chains</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">2,500.00 USDC</div>
                          <div className="text-red-400 text-sm">+7.25 USDC interest</div>
                        </div>
                        <Badge className="bg-yellow-600 text-white">5.25% APY</Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                            ◈
                          </div>
                          <div>
                            <div className="text-white font-bold">DAI</div>
                            <div className="text-gray-400 text-sm">Borrowed 10 days ago</div>
                            <div className="flex items-center space-x-1 mt-1">
                              <GlobeIcon className="h-3 w-3 text-cyan-400" />
                              <span className="text-xs text-cyan-400">3 chains</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">600.00 DAI</div>
                          <div className="text-red-400 text-sm">+0.85 DAI interest</div>
                        </div>
                        <Badge className="bg-yellow-600 text-white">5.15% APY</Badge>
                      </div>
                    </div>

                    <div className="text-center py-4 border-t border-gray-800">
                      <div className="text-gray-300 text-sm mb-2">Total Borrowed Across Chains</div>
                      <div className="text-red-400 font-bold text-2xl">$3,108.10</div>
                      <div className="text-gray-400 text-sm">Including accrued interest</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

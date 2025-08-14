"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeftIcon, InfoIcon, TrendingUpIcon, CheckCircleIcon, GlobeIcon } from "lucide-react"
import Link from "next/link"

const SUPPLY_ASSETS = [
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "💰",
    balance: "1,250.00",
    apy: "4.25%",
    supplied: "0.00",
    price: "$1.00",
    totalSupplied: "$1.2B",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "⟠",
    balance: "2.45",
    apy: "3.85%",
    supplied: "0.00",
    price: "$2,340.50",
    totalSupplied: "$890M",
    chains: ["Ethereum", "Arbitrum", "Optimism"],
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    icon: "₿",
    balance: "0.125",
    apy: "2.95%",
    supplied: "0.00",
    price: "$43,250.00",
    totalSupplied: "$340M",
    chains: ["Ethereum", "Polygon"],
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    icon: "◈",
    balance: "850.00",
    apy: "4.15%",
    supplied: "0.00",
    price: "$1.00",
    totalSupplied: "$280M",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
]

export default function SupplyPage() {
  const [selectedAsset, setSelectedAsset] = useState<(typeof SUPPLY_ASSETS)[0] | null>(null)
  const [supplyAmount, setSupplyAmount] = useState("")
  const [isSupplying, setIsSupplying] = useState(false)

  const handleSupply = async () => {
    if (!selectedAsset || !supplyAmount) return

    setIsSupplying(true)
    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSupplying(false)
    setSupplyAmount("")
    setSelectedAsset(null)
  }

  const calculateEarnings = () => {
    if (!selectedAsset || !supplyAmount) return "0.00"
    const amount = Number.parseFloat(supplyAmount)
    const apy = Number.parseFloat(selectedAsset.apy.replace("%", "")) / 100
    return ((amount * apy) / 365).toFixed(6)
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
              <h1 className="font-heading text-2xl text-white">Xyra.fi - Supply Assets</h1>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Connected</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl text-white mb-4">Supply & Earn Across Chains</h2>
            <p className="text-gray-400 text-lg">
              Supply your crypto assets to unified liquidity pools and earn competitive yields across multiple
              blockchains
            </p>
          </div>

          <Tabs defaultValue="supply" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="supply"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Supply Assets
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Your Positions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="supply" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Asset Selection */}
                <div className="lg:col-span-2">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading">Select Asset to Supply</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {SUPPLY_ASSETS.map((asset) => (
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
                                <div className="text-green-400 font-bold text-lg">{asset.apy}</div>
                                <div className="text-gray-400 text-sm">Supply APY</div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {asset.balance} {asset.symbol}
                                </div>
                                <div className="text-gray-400 text-sm">Available</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Supply Form */}
                <div>
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading">Supply Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAsset ? (
                        <div className="space-y-6">
                          <div>
                            <label className="text-gray-300 text-sm font-medium mb-2 block">Amount to Supply</label>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={supplyAmount}
                                onChange={(e) => setSupplyAmount(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-20"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {selectedAsset.symbol}
                              </div>
                            </div>
                            <div className="flex justify-between mt-2">
                              <span className="text-gray-400 text-sm">
                                Balance: {selectedAsset.balance} {selectedAsset.symbol}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                                onClick={() => setSupplyAmount(selectedAsset.balance)}
                              >
                                MAX
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3 p-4 rounded-lg bg-gray-800">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Supply APY</span>
                              <span className="text-green-400 font-bold">{selectedAsset.apy}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Daily Earnings</span>
                              <span className="text-white">
                                ~{calculateEarnings()} {selectedAsset.symbol}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Available Chains</span>
                              <span className="text-cyan-400">{selectedAsset.chains.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Collateral Factor</span>
                              <span className="text-white">85%</span>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <InfoIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-blue-200 text-sm">
                              Assets are automatically deployed across multiple chains for optimal yield. Supplied
                              assets can be used as collateral to borrow other assets.
                            </div>
                          </div>

                          <Button
                            onClick={handleSupply}
                            disabled={!supplyAmount || Number.parseFloat(supplyAmount) <= 0 || isSupplying}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                          >
                            {isSupplying ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Supplying...</span>
                              </div>
                            ) : (
                              `Supply ${selectedAsset.symbol}`
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                            <TrendingUpIcon className="h-8 w-8 text-blue-400" />
                          </div>
                          <p className="text-gray-400">Select an asset to start supplying</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="positions" className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-heading">Your Supply Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mock positions */}
                    <div className="p-4 rounded-lg bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                            💰
                          </div>
                          <div>
                            <div className="text-white font-bold">USDC</div>
                            <div className="text-gray-400 text-sm">Supplied 30 days ago</div>
                            <div className="flex items-center space-x-1 mt-1">
                              <GlobeIcon className="h-3 w-3 text-cyan-400" />
                              <span className="text-xs text-cyan-400">3 chains</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">500.00 USDC</div>
                          <div className="text-green-400 text-sm">+1.75 USDC earned</div>
                        </div>
                        <Badge className="bg-green-600 text-white">Active</Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                            ⟠
                          </div>
                          <div>
                            <div className="text-white font-bold">ETH</div>
                            <div className="text-gray-400 text-sm">Supplied 15 days ago</div>
                            <div className="flex items-center space-x-1 mt-1">
                              <GlobeIcon className="h-3 w-3 text-cyan-400" />
                              <span className="text-xs text-cyan-400">3 chains</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">1.25 ETH</div>
                          <div className="text-green-400 text-sm">+0.0198 ETH earned</div>
                        </div>
                        <Badge className="bg-green-600 text-white">Active</Badge>
                      </div>
                    </div>

                    <div className="text-center py-8 text-gray-400">
                      <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-400" />
                      <p>You're earning yield across multiple chains!</p>
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

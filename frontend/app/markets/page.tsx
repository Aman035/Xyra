"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeftIcon,
  TrendingUpIcon,
  BarChart3Icon,
  PieChartIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InfoIcon,
  GlobeIcon,
} from "lucide-react"
import Link from "next/link"

const MARKET_DATA = [
  {
    asset: "USDC",
    name: "USD Coin",
    icon: "💰",
    price: "$1.00",
    priceChange: "+0.01%",
    supplyApy: "4.25%",
    borrowApy: "5.25%",
    totalSupplied: "$1.2B",
    totalBorrowed: "$890M",
    utilization: 74.2,
    liquidity: "$310M",
    marketCap: "$28.5B",
    volume24h: "$2.1B",
    trend: "up",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
  {
    asset: "ETH",
    name: "Ethereum",
    icon: "⟠",
    price: "$2,340.50",
    priceChange: "+2.45%",
    supplyApy: "3.85%",
    borrowApy: "4.85%",
    totalSupplied: "$890M",
    totalBorrowed: "$650M",
    utilization: 73.0,
    liquidity: "$240M",
    marketCap: "$281.2B",
    volume24h: "$12.8B",
    trend: "up",
    chains: ["Ethereum", "Arbitrum", "Optimism"],
  },
  {
    asset: "WBTC",
    name: "Wrapped Bitcoin",
    icon: "₿",
    price: "$43,250.00",
    priceChange: "+1.85%",
    supplyApy: "2.95%",
    borrowApy: "3.95%",
    totalSupplied: "$340M",
    totalBorrowed: "$240M",
    utilization: 70.6,
    liquidity: "$100M",
    marketCap: "$6.8B",
    volume24h: "$890M",
    trend: "up",
    chains: ["Ethereum", "Polygon"],
  },
  {
    asset: "DAI",
    name: "Dai Stablecoin",
    icon: "◈",
    price: "$1.00",
    priceChange: "-0.02%",
    supplyApy: "4.15%",
    borrowApy: "5.15%",
    totalSupplied: "$280M",
    totalBorrowed: "$180M",
    utilization: 64.3,
    liquidity: "$100M",
    marketCap: "$5.3B",
    volume24h: "$145M",
    trend: "down",
    chains: ["Ethereum", "Polygon", "Arbitrum"],
  },
]

export default function MarketsPage() {
  const [selectedAsset, setSelectedAsset] = useState<(typeof MARKET_DATA)[0] | null>(MARKET_DATA[0])
  const [sortBy, setSortBy] = useState<"asset" | "supplyApy" | "borrowApy" | "utilization">("asset")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const totalTVL = MARKET_DATA.reduce(
    (sum, market) =>
      sum + Number.parseFloat(market.totalSupplied.replace("$", "").replace("B", "000000000").replace("M", "000000")),
    0,
  )

  const sortedMarkets = [...MARKET_DATA].sort((a, b) => {
    let aValue: number | string
    let bValue: number | string

    switch (sortBy) {
      case "supplyApy":
        aValue = Number.parseFloat(a.supplyApy.replace("%", ""))
        bValue = Number.parseFloat(b.supplyApy.replace("%", ""))
        break
      case "borrowApy":
        aValue = Number.parseFloat(a.borrowApy.replace("%", ""))
        bValue = Number.parseFloat(b.borrowApy.replace("%", ""))
        break
      case "utilization":
        aValue = a.utilization
        bValue = b.utilization
        break
      default:
        aValue = a.asset
        bValue = b.asset
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

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
              <h1 className="font-heading text-2xl text-white">Xyra.fi - Markets</h1>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Connected</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl text-white mb-4">Cross-Chain Market Overview</h2>
            <p className="text-gray-400 text-lg">
              Real-time market data and analytics for unified liquidity pools across multiple blockchains
            </p>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Value Locked</CardTitle>
                <BarChart3Icon className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${(totalTVL / 1000000000).toFixed(1)}B</div>
                <p className="text-xs text-green-400 flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Active Chains</CardTitle>
                <GlobeIcon className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">5</div>
                <p className="text-gray-400">Unified liquidity</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Average Supply APY</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">3.80%</div>
                <p className="text-xs text-green-400 flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +0.15% this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Cross-Chain Users</CardTitle>
                <PieChartIcon className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">12.4K</div>
                <p className="text-xs text-green-400 flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +8.2% this week
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="overview"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Market Overview
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Asset Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white font-heading">All Cross-Chain Markets</CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Sort by:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-300 hover:text-white"
                        onClick={() => {
                          setSortBy("supplyApy")
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }}
                      >
                        Supply APY
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-300 hover:text-white"
                        onClick={() => {
                          setSortBy("utilization")
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }}
                      >
                        Utilization
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedMarkets.map((market) => (
                      <div
                        key={market.asset}
                        className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => setSelectedAsset(market)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                              {market.icon}
                            </div>
                            <div>
                              <div className="text-white font-bold">{market.asset}</div>
                              <div className="text-gray-400 text-sm">{market.name}</div>
                              <div className="flex items-center space-x-1 mt-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">{market.chains.length} chains</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-white font-medium">{market.price}</div>
                            <div
                              className={`text-sm ${
                                market.trend === "up" ? "text-green-400" : "text-red-400"
                              } flex items-center justify-center`}
                            >
                              {market.trend === "up" ? (
                                <ArrowUpIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowDownIcon className="h-3 w-3 mr-1" />
                              )}
                              {market.priceChange}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-green-400 font-bold">{market.supplyApy}</div>
                            <div className="text-gray-400 text-sm">Supply APY</div>
                          </div>

                          <div className="text-center">
                            <div className="text-red-400 font-bold">{market.borrowApy}</div>
                            <div className="text-gray-400 text-sm">Borrow APY</div>
                          </div>

                          <div className="text-center">
                            <div className="text-white font-medium">{market.utilization.toFixed(1)}%</div>
                            <Progress value={market.utilization} className="h-1 mt-1" />
                          </div>

                          <div className="text-center">
                            <div className="text-white font-medium">{market.liquidity}</div>
                            <div className="text-gray-400 text-sm">Liquidity</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">Cross-Chain Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MARKET_DATA.map((market) => (
                        <div key={market.asset}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
                                {market.icon}
                              </div>
                              <span className="text-gray-300">{market.asset}</span>
                              <div className="flex items-center space-x-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">{market.chains.length}</span>
                              </div>
                            </div>
                            <span className="text-white font-bold">{market.utilization.toFixed(1)}%</span>
                          </div>
                          <Progress value={market.utilization} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">TVL Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MARKET_DATA.map((market) => {
                        const marketTVL = Number.parseFloat(
                          market.totalSupplied.replace("$", "").replace("B", "000000000").replace("M", "000000"),
                        )
                        const percentage = ((marketTVL / totalTVL) * 100).toFixed(1)
                        return (
                          <div key={market.asset}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
                                  {market.icon}
                                </div>
                                <span className="text-gray-300">{market.asset}</span>
                              </div>
                              <span className="text-white font-bold">{percentage}%</span>
                            </div>
                            <Progress value={Number.parseFloat(percentage)} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              {selectedAsset && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white mr-3">
                          {selectedAsset.icon}
                        </div>
                        {selectedAsset.asset} Cross-Chain Market
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-gray-400 text-sm">Current Price</div>
                            <div className="text-white font-bold text-2xl">{selectedAsset.price}</div>
                            <div
                              className={`text-sm ${
                                selectedAsset.trend === "up" ? "text-green-400" : "text-red-400"
                              } flex items-center`}
                            >
                              {selectedAsset.trend === "up" ? (
                                <ArrowUpIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowDownIcon className="h-3 w-3 mr-1" />
                              )}
                              {selectedAsset.priceChange} (24h)
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm">Market Cap</div>
                            <div className="text-white font-bold">{selectedAsset.marketCap}</div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm">24h Volume</div>
                            <div className="text-white font-bold">{selectedAsset.volume24h}</div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm">Active Chains</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedAsset.chains.map((chain) => (
                                <span key={chain} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                                  {chain}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-gray-400 text-sm">Total Supplied</div>
                            <div className="text-white font-bold">{selectedAsset.totalSupplied}</div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm">Total Borrowed</div>
                            <div className="text-white font-bold">{selectedAsset.totalBorrowed}</div>
                          </div>

                          <div>
                            <div className="text-gray-400 text-sm">Available Liquidity</div>
                            <div className="text-white font-bold">{selectedAsset.liquidity}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white font-heading">Interest Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300">Supply APY</span>
                            <span className="text-green-400 font-bold text-xl">{selectedAsset.supplyApy}</span>
                          </div>
                          <div className="flex items-start space-x-2 p-2 rounded bg-green-500/10">
                            <InfoIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="text-green-200 text-xs">
                              Earn {selectedAsset.supplyApy} annually across {selectedAsset.chains.length} chains
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300">Borrow APY</span>
                            <span className="text-red-400 font-bold text-xl">{selectedAsset.borrowApy}</span>
                          </div>
                          <div className="flex items-start space-x-2 p-2 rounded bg-red-500/10">
                            <InfoIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-red-200 text-xs">
                              Pay {selectedAsset.borrowApy} annually when borrowing from unified pools
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300">Utilization Rate</span>
                            <span className="text-white font-bold">{selectedAsset.utilization.toFixed(1)}%</span>
                          </div>
                          <Progress value={selectedAsset.utilization} className="h-2" />
                        </div>

                        <div className="pt-4 space-y-2">
                          <Link href="/supply">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                              Supply {selectedAsset.asset}
                            </Button>
                          </Link>
                          <Link href="/borrow">
                            <Button
                              variant="outline"
                              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                            >
                              Borrow {selectedAsset.asset}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

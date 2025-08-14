"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeftIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
} from "lucide-react"
import Link from "next/link"

const SUPPLY_POSITIONS = [
  {
    asset: "USDC",
    icon: "💰",
    supplied: "500.00",
    value: "$500.00",
    apy: "4.25%",
    earned: "1.75",
    earnedValue: "$1.75",
    daysActive: 30,
    chains: 3,
  },
  {
    asset: "ETH",
    icon: "⟠",
    supplied: "1.25",
    value: "$2,925.63",
    apy: "3.85%",
    earned: "0.0198",
    earnedValue: "$46.32",
    daysActive: 15,
    chains: 3,
  },
]

const BORROW_POSITIONS = [
  {
    asset: "USDC",
    icon: "💰",
    borrowed: "2,500.00",
    value: "$2,500.00",
    apy: "5.25%",
    interest: "7.25",
    interestValue: "$7.25",
    daysActive: 20,
    chains: 3,
  },
  {
    asset: "DAI",
    icon: "◈",
    borrowed: "600.00",
    value: "$600.00",
    apy: "5.15%",
    interest: "0.85",
    interestValue: "$0.85",
    daysActive: 10,
    chains: 3,
  },
]

const TRANSACTION_HISTORY = [
  {
    type: "Supply",
    asset: "ETH",
    amount: "1.25",
    value: "$2,925.63",
    date: "2024-01-15",
    txHash: "0x1234...5678",
    status: "Completed",
    chain: "Ethereum",
  },
  {
    type: "Borrow",
    asset: "USDC",
    amount: "2,500.00",
    value: "$2,500.00",
    date: "2024-01-10",
    txHash: "0x5678...9012",
    status: "Completed",
    chain: "Arbitrum",
  },
  {
    type: "Supply",
    asset: "USDC",
    amount: "500.00",
    value: "$500.00",
    date: "2024-01-05",
    txHash: "0x9012...3456",
    status: "Completed",
    chain: "Polygon",
  },
  {
    type: "Borrow",
    asset: "DAI",
    amount: "600.00",
    value: "$600.00",
    date: "2024-01-20",
    txHash: "0x3456...7890",
    status: "Completed",
    chain: "Ethereum",
  },
]

export default function PortfolioPage() {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)

  const totalSupplyValue = SUPPLY_POSITIONS.reduce(
    (sum, pos) => sum + Number.parseFloat(pos.value.replace("$", "").replace(",", "")),
    0,
  )
  const totalBorrowValue = BORROW_POSITIONS.reduce(
    (sum, pos) => sum + Number.parseFloat(pos.value.replace("$", "").replace(",", "")),
    0,
  )
  const netWorth = totalSupplyValue - totalBorrowValue
  const totalEarned = SUPPLY_POSITIONS.reduce(
    (sum, pos) => sum + Number.parseFloat(pos.earnedValue.replace("$", "")),
    0,
  )
  const totalInterest = BORROW_POSITIONS.reduce(
    (sum, pos) => sum + Number.parseFloat(pos.interestValue.replace("$", "")),
    0,
  )
  const healthFactor = 2.65

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
              <h1 className="font-heading text-2xl text-white">Xyra.fi - Portfolio</h1>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Connected</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl text-white mb-4">Your Cross-Chain DeFi Portfolio</h2>
            <p className="text-gray-400 text-lg">
              Track your positions, earnings, and manage your unified DeFi investments across multiple blockchains
            </p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Net Worth</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${netWorth.toLocaleString()}</div>
                <p className="text-xs text-green-400 flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +5.2% this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Supplied</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${totalSupplyValue.toLocaleString()}</div>
                <p className="text-xs text-green-400 flex items-center">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +${totalEarned.toFixed(2)} earned
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Borrowed</CardTitle>
                <TrendingDownIcon className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${totalBorrowValue.toLocaleString()}</div>
                <p className="text-xs text-red-400 flex items-center">
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                  -${totalInterest.toFixed(2)} interest
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Health Factor</CardTitle>
                <BarChart3Icon className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{healthFactor}</div>
                <p className="text-xs text-green-400">Safe</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="positions"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Positions
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Supply Positions */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center">
                      <TrendingUpIcon className="h-5 w-5 mr-2 text-green-400" />
                      Supply Positions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {SUPPLY_POSITIONS.map((position) => (
                        <div
                          key={position.asset}
                          className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                                {position.icon}
                              </div>
                              <div>
                                <div className="text-white font-bold">{position.asset}</div>
                                <div className="text-gray-400 text-sm">{position.daysActive} days active</div>
                                <div className="flex items-center space-x-1 mt-1">
                                  <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                  <span className="text-xs text-cyan-400">{position.chains} chains</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-green-600 text-white">{position.apy}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-400">Supplied</div>
                              <div className="text-white font-medium">
                                {position.supplied} {position.asset}
                              </div>
                              <div className="text-gray-400">{position.value}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Earned</div>
                              <div className="text-green-400 font-medium">
                                +{position.earned} {position.asset}
                              </div>
                              <div className="text-green-400">{position.earnedValue}</div>
                            </div>
                          </div>

                          <div className="flex space-x-2 mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                            >
                              Withdraw
                            </Button>
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                              Supply More
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Borrow Positions */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center">
                      <TrendingDownIcon className="h-5 w-5 mr-2 text-red-400" />
                      Borrow Positions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {BORROW_POSITIONS.map((position) => (
                        <div
                          key={position.asset}
                          className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                                {position.icon}
                              </div>
                              <div>
                                <div className="text-white font-bold">{position.asset}</div>
                                <div className="text-gray-400 text-sm">{position.daysActive} days active</div>
                                <div className="flex items-center space-x-1 mt-1">
                                  <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                  <span className="text-xs text-cyan-400">{position.chains} chains</span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-red-600 text-white">{position.apy}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-400">Borrowed</div>
                              <div className="text-white font-medium">
                                {position.borrowed} {position.asset}
                              </div>
                              <div className="text-gray-400">{position.value}</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Interest Owed</div>
                              <div className="text-red-400 font-medium">
                                +{position.interest} {position.asset}
                              </div>
                              <div className="text-red-400">{position.interestValue}</div>
                            </div>
                          </div>

                          <div className="flex space-x-2 mt-4">
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                              Repay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                            >
                              Borrow More
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">Portfolio Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">USDC</span>
                        <span className="text-white font-bold">14.6%</span>
                      </div>
                      <Progress value={14.6} className="h-2" />

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">ETH</span>
                        <span className="text-white font-bold">85.4%</span>
                      </div>
                      <Progress value={85.4} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white font-heading">Cross-Chain Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total Earnings</span>
                        <span className="text-green-400 font-bold">+${totalEarned.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total Interest Paid</span>
                        <span className="text-red-400 font-bold">-${totalInterest.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Net Profit</span>
                        <span className="text-green-400 font-bold">+${(totalEarned - totalInterest).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Active Chains</span>
                        <span className="text-cyan-400 font-bold">5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Average APY</span>
                        <span className="text-white font-bold">4.05%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white font-heading">Cross-Chain Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {TRANSACTION_HISTORY.map((tx, index) => (
                      <div key={index} className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                                tx.type === "Supply" ? "bg-green-600" : "bg-red-600"
                              }`}
                            >
                              {tx.type === "Supply" ? (
                                <TrendingUpIcon className="h-5 w-5" />
                              ) : (
                                <TrendingDownIcon className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="text-white font-bold">
                                {tx.type} {tx.asset}
                              </div>
                              <div className="text-gray-400 text-sm">{tx.date}</div>
                              <div className="flex items-center space-x-1 mt-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">{tx.chain}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-bold">
                              {tx.amount} {tx.asset}
                            </div>
                            <div className="text-gray-400 text-sm">{tx.value}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-600 text-white">{tx.status}</Badge>
                            <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 p-1">
                              <ExternalLinkIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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

'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  GlobeIcon,
} from 'lucide-react'

type SupplyPosition = {
  asset: string
  icon: string
  supplied: string
  value: string
  apy: string
  earned: string
  earnedValue: string
  daysActive: number
  chains: number
}

type BorrowPosition = {
  asset: string
  icon: string
  borrowed: string
  value: string
  apy: string
  interest: string
  interestValue: string
  daysActive: number
  chains: number
}

const SUPPLY_POSITIONS: SupplyPosition[] = [
  {
    asset: 'USDC',
    icon: '💰',
    supplied: '500.00',
    value: '$500.00',
    apy: '4.25%',
    earned: '1.75',
    earnedValue: '$1.75',
    daysActive: 30,
    chains: 3,
  },
  {
    asset: 'ETH',
    icon: '⟠',
    supplied: '1.25',
    value: '$2,925.63',
    apy: '3.85%',
    earned: '0.0198',
    earnedValue: '$46.32',
    daysActive: 15,
    chains: 3,
  },
]

const BORROW_POSITIONS: BorrowPosition[] = [
  {
    asset: 'USDC',
    icon: '💰',
    borrowed: '2,500.00',
    value: '$2,500.00',
    apy: '5.25%',
    interest: '7.25',
    interestValue: '$7.25',
    daysActive: 20,
    chains: 3,
  },
  {
    asset: 'DAI',
    icon: '◈',
    borrowed: '600.00',
    value: '$600.00',
    apy: '5.15%',
    interest: '0.85',
    interestValue: '$0.85',
    daysActive: 10,
    chains: 3,
  },
]

// --- helpers (no UI changes)
const moneyToNumber = (v: string) => Number.parseFloat(v.replace(/[$,]/g, ''))

export default function PortfolioPage() {
  const healthFactor = 2.65

  const totalSupplyValue = useMemo(
    () => SUPPLY_POSITIONS.reduce((sum, p) => sum + moneyToNumber(p.value), 0),
    []
  )

  const totalBorrowValue = useMemo(
    () => BORROW_POSITIONS.reduce((sum, p) => sum + moneyToNumber(p.value), 0),
    []
  )

  const netWorth = useMemo(
    () => totalSupplyValue - totalBorrowValue,
    [totalSupplyValue, totalBorrowValue]
  )

  const totalEarned = useMemo(
    () =>
      SUPPLY_POSITIONS.reduce(
        (sum, p) => sum + moneyToNumber(p.earnedValue),
        0
      ),
    []
  )

  const totalInterest = useMemo(
    () =>
      BORROW_POSITIONS.reduce(
        (sum, p) => sum + moneyToNumber(p.interestValue),
        0
      ),
    []
  )

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-4xl text-white mb-4">
            Your Cross-Chain DeFi Portfolio
          </h2>
          <p className="text-gray-400 text-lg">
            Track your positions, earnings, and manage your unified DeFi
            investments
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Net Worth
              </CardTitle>
              <DollarSignIcon className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${netWorth.toLocaleString()}
              </div>
              <p className="text-xs text-green-400 flex items-center">
                <ArrowUpIcon className="h-3 w-3 mr-1" />
                +5.2% this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Supplied
              </CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${totalSupplyValue.toLocaleString()}
              </div>
              <p className="text-xs text-green-400 flex items-center">
                <ArrowUpIcon className="h-3 w-3 mr-1" />
                +${totalEarned.toFixed(2)} earned
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Borrowed
              </CardTitle>
              <TrendingDownIcon className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${totalBorrowValue.toLocaleString()}
              </div>
              <p className="text-xs text-red-400 flex items-center">
                <ArrowDownIcon className="h-3 w-3 mr-1" />
                -${totalInterest.toFixed(2)} interest
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Health Factor
              </CardTitle>
              <BarChart3Icon className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {healthFactor}
              </div>
              <p className="text-xs text-green-400">Safe</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="positions" className="w-full">
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
                              <div className="text-white font-bold">
                                {position.asset}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {position.daysActive} days active
                              </div>
                              <div className="flex items-center space-x-1 mt-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">
                                  {position.chains} chains
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-green-600 text-white">
                            {position.apy}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Supplied</div>
                            <div className="text-white font-medium">
                              {position.supplied} {position.asset}
                            </div>
                            <div className="text-gray-400">
                              {position.value}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Earned</div>
                            <div className="text-green-400 font-medium">
                              +{position.earned} {position.asset}
                            </div>
                            <div className="text-green-400">
                              {position.earnedValue}
                            </div>
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
                              <div className="text-white font-bold">
                                {position.asset}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {position.daysActive} days active
                              </div>
                              <div className="flex items-center space-x-1 mt-1">
                                <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs text-cyan-400">
                                  {position.chains} chains
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-red-600 text-white">
                            {position.apy}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400">Borrowed</div>
                            <div className="text-white font-medium">
                              {position.borrowed} {position.asset}
                            </div>
                            <div className="text-gray-400">
                              {position.value}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Interest Owed</div>
                            <div className="text-red-400 font-medium">
                              +{position.interest} {position.asset}
                            </div>
                            <div className="text-red-400">
                              {position.interestValue}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Repay
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

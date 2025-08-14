import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Shield, Zap, Globe, Link2 } from "lucide-react"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white font-serif">Xyra.fi</h1>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-white font-medium">
                Dashboard
              </Link>
              <Link href="/supply" className="text-gray-400 hover:text-white transition-colors">
                Supply
              </Link>
              <Link href="/borrow" className="text-gray-400 hover:text-white transition-colors">
                Borrow
              </Link>
              <Link href="/portfolio" className="text-gray-400 hover:text-white transition-colors">
                Portfolio
              </Link>
              <Link href="/markets" className="text-gray-400 hover:text-white transition-colors">
                Markets
              </Link>
            </nav>

            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">Connect Wallet</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-blue-400 mr-3" />
            <span className="text-blue-400 font-medium">Universal Cross-Chain Protocol</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-serif">
            Unified Liquidity
            <span className="text-blue-400"> Across All Chains</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Lend and borrow seamlessly across Ethereum, Polygon, Arbitrum, and more. One protocol, infinite
            possibilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/supply">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Value Locked</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-serif">$8.7B</div>
              <p className="text-xs text-green-400">Across 12 chains</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Chains</CardTitle>
              <Globe className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-serif">12</div>
              <p className="text-xs text-blue-400">Networks connected</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Cross-Chain Users</CardTitle>
              <Shield className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-serif">127K</div>
              <p className="text-xs text-cyan-400">Multi-chain active</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Best APY</CardTitle>
              <Zap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white font-serif">12.8%</div>
              <p className="text-xs text-yellow-400">Optimized rates</p>
            </CardContent>
          </Card>
        </div>

        {/* Cross-Chain Markets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white font-serif flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-400" />
                Cross-Chain Supply Markets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { asset: "USDC", apy: "8.2%", chains: "ETH, POLY, ARB", tvl: "$1.2B" },
                { asset: "ETH", apy: "6.8%", chains: "ETH, ARB, OP", tvl: "$890M" },
                { asset: "WBTC", apy: "5.9%", chains: "ETH, POLY", tvl: "$450M" },
              ].map((market) => (
                <div
                  key={market.asset}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors border border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{market.asset.slice(0, 2)}</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">{market.asset}</span>
                      <div className="text-gray-400 text-xs">{market.chains}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-medium">{market.apy}</div>
                    <div className="text-gray-400 text-sm">{market.tvl}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white font-serif flex items-center">
                <Link2 className="w-5 h-5 mr-2 text-cyan-400" />
                Unified Borrow Markets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { asset: "USDC", apy: "9.8%", chains: "ETH, POLY, ARB", available: "$680M" },
                { asset: "ETH", apy: "8.2%", chains: "ETH, ARB, OP", available: "$420M" },
                { asset: "WBTC", apy: "7.1%", chains: "ETH, POLY", available: "$195M" },
              ].map((market) => (
                <div
                  key={market.asset}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors border border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{market.asset.slice(0, 2)}</span>
                    </div>
                    <div>
                      <span className="text-white font-medium">{market.asset}</span>
                      <div className="text-gray-400 text-xs">{market.chains}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-medium">{market.apy}</div>
                    <div className="text-gray-400 text-sm">{market.available}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Cross-Chain Benefits */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-8 font-serif">Why Choose Xyra.fi?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <Globe className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Cross-Chain Access</h3>
              <p className="text-gray-400">Access liquidity from 12+ blockchains in one unified interface</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Optimized Rates</h3>
              <p className="text-gray-400">Get the best lending and borrowing rates across all networks</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <Shield className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Unified Security</h3>
              <p className="text-gray-400">Battle-tested security protocols across all supported chains</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

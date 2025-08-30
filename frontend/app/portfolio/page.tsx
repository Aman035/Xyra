"use client";

// import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input";
// import { Tabs, TabsContent } from '@/components/ui/tabs'
// import { Progress } from '@/components/ui/progress'
import { ShieldCheckIcon, InfoIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";

import { VAULTS } from "@/lib/vaults";
import { HexAddr, readContract } from "@/lib/viem";
import { formatUnits, bytesToHex, padHex } from "viem";
import {
  CHAIN_ID_TO_CHAIN,
  CHAINS,
  getTokenZrc20Address,
  VM,
} from "@/lib/chains";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { borrow } from "@/lib/lendingPool";
import { computeUserId } from "@/lib/universalIdentity";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  GlobeIcon,
} from "lucide-react";
import { pctLabel, RAY_DECIMALS } from "../supply/page";
import { BIG_HF, HF_DECIMALS } from "../borrow/page";
import { PRICE_ORACLE_ABI } from "@/lib/abis";
import { TOTAL_ACTIVE_CHAINS } from "../page";
import Image from "next/image";

// ----------------------------
// Types
// ----------------------------
type Row = {
  symbol: string;
  name: string;
  logo: string;
  zrc20: `0x${string}`;
  borrowApyPct: number | null;
  borrowApy: string;
  suppliedNum: number;
  supplied: string;
  supplyApyPct: number | null;
  supplyApy: string;
  borrowedNum: number;
  borrowed: string;
  utilizationPct: number | null;
  loading: boolean;
  tvl: string;
  suppliedUSD: string;
  borrowedUSD: string;
  decimals: number;
};

export default function PortfolioPage() {
  // ----------------------------
  // User & wallet state (Privy) — mirror SupplyPage
  // ----------------------------
  const { user } = usePrivy();
  const { wallets: evmWallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();

  const currentWallet = useMemo(() => {
    const evm = (evmWallets as any[]).map((w) => ({
      ...w,
      chainType: "ethereum",
    }));
    const sol = (solWallets as any[]).map((w) => ({
      ...w,
      chainType: "solana",
    }));
    const all = [...evm, ...sol];
    const addr = user?.wallet?.address?.toLowerCase();
    if (!addr) return undefined;
    return all.find((w) => w.address?.toLowerCase?.() === addr);
  }, [evmWallets, solWallets, user?.wallet?.address]);

  const currentChain = useMemo(() => {
    if (!currentWallet) return CHAINS.sepolia;

    if ((currentWallet as any).chainType === "solana") {
      return CHAINS.solDevnet; // adjust if you support more solana nets
    }

    const raw = String((currentWallet as any).chainId ?? "eip155:11155111");
    const evmId = raw.includes(":") ? raw.split(":")[1] : raw;
    return CHAIN_ID_TO_CHAIN[parseInt(evmId)] ?? CHAINS.sepolia;
  }, [currentWallet]);

  // const currentChainKey: ChainKey = useMemo(() => {
  //   const match = (Object.keys(CHAINS) as ChainKey[]).find(
  //     (k) => CHAINS[k] === currentChain
  //   )
  //   return match ?? 'sepolia'
  // }, [currentChain])

  // ----------------------------
  // Health Factor — get from contract using universal identity bytes
  // ----------------------------
  const [healthFactor, setHealthFactor] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchHF() {
      try {
        if (!currentWallet?.address) {
          if (mounted) setHealthFactor(null);
          return;
        }

        const userIdHex = computeUserId(
          currentWallet.chainId.split(":")[1],
          currentWallet.address
        );
        if (!userIdHex) {
          if (mounted) setHealthFactor(null);
          return;
        }

        const hfRaw = await readContract<bigint>({
          functionName: "getHealthFactor",
          args: [userIdHex],
        });

        const parsed = Number.parseFloat(formatUnits(hfRaw, HF_DECIMALS));

        let hfForUi: number | null = Number.isFinite(parsed) ? parsed : null;
        if (hfForUi !== null && hfForUi <= 0) hfForUi = null; // no position
        if (hfForUi !== null && hfForUi > BIG_HF) hfForUi = Infinity; // show ∞

        if (mounted) setHealthFactor(hfForUi);
      } catch (e) {
        console.log("getHealthFactor error", e);
        if (mounted) setHealthFactor(null);
      }
    }

    fetchHF();
    return () => {
      mounted = false;
    };
  }, [currentWallet?.address, currentWallet]);

  const getHealthFactorColor = (factor: number | null) => {
    if (factor == null) return "text-gray-400";
    if (factor >= 2) return "text-green-400";
    if (factor >= 1.5) return "text-yellow-400";
    return "text-red-400";
  };

  // ----------------------------
  // Vault data
  // ----------------------------
  const rowsBase: Row[] = useMemo(() => {
    return Object.values(VAULTS).map((v) => {
      const symbol = v.asset.symbol;
      return {
        symbol,
        name: v.asset.name,
        logo: v.asset.logo,
        tvl: "—",
        zrc20: v.zrc20TokenAddress,
        borrowApyPct: null,
        borrowApy: "—",
        supplyApyPct: null,
        supplyApy: "—",
        borrowedNum: 0,
        borrowed: "0",
        utilizationPct: null,
        loading: true,
        suppliedNum: 0,
        supplied: "0",
        suppliedUSD: "0",
        borrowedUSD: "0",
        decimals: v.asset.decimals,
      };
    });
  }, []);

  const [rows, setRows] = useState<Row[]>(rowsBase);

  // ----------------------------
  // Load on-chain data
  // ----------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!currentWallet?.address) {
        return;
      }

      const userIdHex = computeUserId(
        currentWallet.chainId.split(":")[1],
        currentWallet.address
      );
      if (!userIdHex) {
        return;
      }

      setRows((prev) => prev.map((r) => ({ ...r, loading: true })));
      let totalUsd = 0;

      const next = await Promise.all(
        rowsBase.map(async (r) => {
          try {
            // const decimals = 18

            const userSupplied = await readContract<bigint>({
              functionName: "getUserSuppliedAsset",
              args: [userIdHex, r.zrc20],
            });
            const userSuppliedNum = Number.parseFloat(
              formatUnits(userSupplied, r.decimals)
            );
            const userSuppliedStrNum = userSuppliedNum.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 6,
              }
            );

            const userBorrowed = await readContract<bigint>({
              functionName: "getUserBorrowedAsset",
              args: [userIdHex, r.zrc20],
            });
            const userBorrowedNum = Number.parseFloat(
              formatUnits(userBorrowed, r.decimals)
            );
            const userBorrowedStrNum = userBorrowedNum.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 6,
              }
            );

            // Get asset price in USD (18 decimals)
            const priceUsd = await readContract<bigint>({
              address: process.env.NEXT_PUBLIC_PRICE_ORACLE as HexAddr,
              functionName: "getAssetPrice",
              abi: PRICE_ORACLE_ABI,
              args: [r.zrc20],
            });

            // Convert price: 18 decimals → normal number
            const price = Number.parseFloat(formatUnits(priceUsd, 18));

            const supplied = Number.parseFloat(
              formatUnits(userSupplied, r.decimals)
            );
            const borrowed = Number.parseFloat(
              formatUnits(userBorrowed, r.decimals)
            );

            // Supplied value in USD
            const suppliedUSD = supplied * price;
            const borrowedUSD = borrowed * price;

            const borrowRateRay = await readContract<bigint>({
              functionName: "getCurrentBorrowRate",
              args: [r.zrc20],
            });
            const borrowApyPct =
              Number.parseFloat(formatUnits(borrowRateRay, RAY_DECIMALS)) * 100;
            const borrowApy = pctLabel(borrowApyPct);

            const supplyRateRay = await readContract<bigint>({
              functionName: "getCurrentSupplyRate",
              args: [r.zrc20],
            });
            const supplyApyPct =
              Number.parseFloat(formatUnits(supplyRateRay, RAY_DECIMALS)) * 100;
            const supplyApy = pctLabel(supplyApyPct);

            return {
              ...r,
              borrowApyPct: Number.isFinite(borrowApyPct) ? borrowApyPct : 0,
              borrowApy,
              supplyApyPct: Number.isFinite(supplyApyPct) ? supplyApyPct : 0,
              supplyApy,
              borrowedNum: userBorrowedNum,
              borrowed: userBorrowedStrNum,
              loading: false,
              suppliedNum: userSuppliedNum,
              supplied: userSuppliedStrNum,
              suppliedUSD,
              borrowedUSD,
            };
          } catch (e) {
            console.error("market row error", r.symbol, e);
            return { ...r, loading: false };
          }
        })
      );

      if (!cancelled) {
        setRows(next);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [rowsBase, currentWallet?.address, currentWallet]);

  console.log(rows);
  const totalSupplyValue = useMemo(
    () => rows.reduce((sum, p) => sum + parseFloat(p.suppliedUSD), 0),
    [rows]
  );

  const totalBorrowValue = useMemo(
    () => rows.reduce((sum, p) => sum + parseFloat(p.borrowedUSD), 0),
    [rows]
  );

  const netWorth = useMemo(
    () => totalSupplyValue - totalBorrowValue,
    [totalSupplyValue, totalBorrowValue]
  );

  const totalEarned = 0;

  const totalInterest = 0;

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
                ${netWorth.toFixed(2)}
              </div>
              {/* <p className="text-xs text-green-400 flex items-center">
                <ArrowUpIcon className="h-3 w-3 mr-1" />
                +5.2% this month
              </p> */}
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
                ${totalSupplyValue.toFixed(2)}
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
                ${totalBorrowValue.toFixed(2)}
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
              <div
                className={`text-2xl font-bold ${getHealthFactorColor(
                  healthFactor
                )}`}
              >
                {healthFactor == null
                  ? "—"
                  : healthFactor === Infinity
                  ? "∞"
                  : healthFactor.toFixed(2)}
              </div>
              <div className="text-xs text-green-400">
                {healthFactor == null
                  ? "Connect to view"
                  : healthFactor >= 2 || healthFactor === Infinity
                  ? "Safe"
                  : healthFactor >= 1.5
                  ? "Moderate Risk"
                  : "High Risk"}
              </div>
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
                    {rows.map((position) =>
                      position.supplied != "0" ? (
                        <div
                          key={position.zrc20}
                          className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {position.logo ? (
                                    <Image
                                      src={position.logo}
                                      alt={position.name}
                                      width={16}
                                      height={16}
                                    />
                                  ) : (
                                    <span className="text-white text-lg">
                                      {position.symbol}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-bold">
                                  {position.symbol}
                                </div>
                                <div className="flex items-center space-x-1 mt-1">
                                  <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                  <span className="text-xs text-cyan-400">
                                    {TOTAL_ACTIVE_CHAINS} chains
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-green-600 text-white">
                              {position.supplyApy}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm items-center">
                            <div>
                              <div className="text-gray-400">Supplied</div>
                            </div>
                            <div className="justify-self-end">
                              <div className="text-white font-medium">
                                {position.suppliedNum.toFixed(2)}{" "}
                                {position.symbol}
                              </div>
                              <div className="text-gray-400">
                                $ {parseFloat(position.suppliedUSD).toFixed(2)}
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
                      ) : (
                        <div key={position.name}></div>
                      )
                    )}
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
                    {rows.map((position) =>
                      position.borrowed != "0" ? (
                        <div
                          key={position.name}
                          className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {position.logo ? (
                                    <Image
                                      src={position.logo}
                                      alt={position.name}
                                      width={16}
                                      height={16}
                                    />
                                  ) : (
                                    <span className="text-white text-lg">
                                      {position.symbol}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-bold">
                                  {position.symbol}
                                </div>
                                {/* <div className="text-gray-400 text-sm">
                                {position.daysActive} days active
                              </div> */}
                                <div className="flex items-center space-x-1 mt-1">
                                  <GlobeIcon className="h-3 w-3 text-cyan-400" />
                                  <span className="text-xs text-cyan-400">
                                    {TOTAL_ACTIVE_CHAINS} chains
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-red-600 text-white">
                              {position.borrowApy}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm items-center">
                            <div>
                              <div className="text-gray-400">Borrowed</div>
                            </div>
                            <div className="justify-self-end">
                              <div className="text-white font-medium">
                                {position.borrowedNum.toFixed(2)}{" "}
                                {position.symbol}
                              </div>
                              <div className="text-gray-400">
                                $ {parseFloat(position.borrowedUSD).toFixed(2)}
                              </div>
                            </div>
                            {/* <div>
                            <div className="text-gray-400">Interest Owed</div>
                            <div className="text-red-400 font-medium">
                              +{position.interest} {position.asset}
                            </div>
                            <div className="text-red-400">
                              {position.interestValue}
                            </div>
                          </div> */}
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
                      ) : (
                        <div key={position.name}></div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

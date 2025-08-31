"use client";

// import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

import { VAULTS } from "@/lib/vaults";
import { HexAddr, readContract } from "@/lib/viem";
import { formatUnits, bytesToHex, padHex, parseUnits } from "viem";
import {
  CHAIN_ID_TO_CHAIN,
  CHAINS,
  getTokenZrc20Address,
  VM,
} from "@/lib/chains";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { computeUserId } from "@/lib/universalIdentity";
import { useToast } from "@/components/ui/toast";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  GlobeIcon,
  InfoIcon,
} from "lucide-react";
import { ChainKey, pctLabel, RAY_DECIMALS } from "../supply/page";
import { BIG_HF, HF_DECIMALS } from "../borrow/page";
import { PRICE_ORACLE_ABI } from "@/lib/abis";
import { TOTAL_ACTIVE_CHAINS } from "../page";
import { withdraw, repay } from "@/lib/lendingPool";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
// import { parseUnits } from "ethers/lib/utils";

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
  const { showToast } = useToast();

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Row | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  // Compute the key for the current chain (used to sync select defaults)
  const currentChainKey: ChainKey = useMemo(() => {
    const match = (Object.keys(CHAINS) as ChainKey[]).find(
      (k) => CHAINS[k] === currentChain
    );
    return match ?? "sepolia";
  }, [currentChain]);

  // Tokens allowed on the current chain
  const allowedTokens = useMemo(
    () =>
      currentChain.tokens.map((t) => ({
        symbol: t.asset.symbol,
        chainAddress: t.address,
        zrcAddress: t.zrcTokenAddress,
        logo: (t.asset as any)?.logo ?? "",
      })),
    [currentChain]
  );

  // Keep chain as a key, not label (stable)
  const [onBehalfChainKey, setOnBehalfChainKey] = useState<ChainKey>("sepolia");

  // Address defaults to the connected wallet, but user can override
  const [onBehalfAddress, setOnBehalfAddress] = useState<string>("");

  const onBehalfVM = CHAINS[onBehalfChainKey].vm;
  const addressHint =
    onBehalfVM === VM.EVM ? "0x… (EVM address)" : "Base58… (Solana address)";

  // ----------------------------
  // Form state (user-controlled)
  // ----------------------------
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const selected = rows.find((r) => r.symbol === selectedSymbol) || null;

  const [supplyAmount, setSupplyAmount] = useState("");
  const [isSupplying, setIsSupplying] = useState(false);

  const isZetaAthens = onBehalfChainKey === "zetaAthens";

  // Sync defaults when upstream values change
  useEffect(() => {
    setOnBehalfChainKey(currentChainKey);
  }, [currentChainKey]);

  useEffect(() => {
    setOnBehalfAddress(user?.wallet?.address ?? "");
  }, [user?.wallet?.address]);

  // Token select state + clamp when chain (allowedTokens) changes
  const [inputTokenSymbol, setInputTokenSymbol] = useState<string>(
    allowedTokens[0]?.symbol ?? ""
  );

  useEffect(() => {
    if (!allowedTokens.find((t) => t.symbol === inputTokenSymbol)) {
      setInputTokenSymbol(allowedTokens[0]?.symbol ?? "");
    }
  }, [allowedTokens, inputTokenSymbol]);

  // NEW: when on Zeta Athens, always use the selected vault's own token
  useEffect(() => {
    if (isZetaAthens && selected?.symbol) {
      setInputTokenSymbol(selected.symbol);
    }
  }, [isZetaAthens, selected?.symbol]);

  const handleWithdraw = async () => {
    const tokenToBeReceived = getTokenZrc20Address(
      onBehalfChainKey,
      inputTokenSymbol
    );
    if (
      !currentWallet ||
      !selectedAsset ||
      !withdrawAmount ||
      !inputTokenSymbol ||
      !tokenToBeReceived ||
      !onBehalfAddress
    )
      return;

    try {
      setIsWithdrawing(true);

      const txReceipt = await withdraw(
        currentWallet,
        selectedAsset.zrc20,
        parseUnits(withdrawAmount, selectedAsset.decimals),
        tokenToBeReceived,
        CHAINS[onBehalfChainKey].id,
        currentWallet.address
      );

      showToast(
        `Token Withdrawed. Tx: ${txReceipt.transactionHash}\nThis will take a few seconds to reflect in the Asset Vault`
      );
    } catch (err) {
      console.log(err);
      showToast("Withdraw Failed", "error");
    }

    setWithdrawAmount("");
    setWithdrawModalOpen(false);
    setSelectedAsset(null);

    setIsWithdrawing(false);
    setSelectedSymbol(null);
    setOnBehalfChainKey(currentChainKey);
    setOnBehalfAddress(user?.wallet?.address ?? "");
  };

  const handleRepay = async () => {
    if (!currentWallet || !selectedAsset || !repayAmount) return;

    try {
      setIsRepaying(true);

      const userIdHex = computeUserId(
        currentWallet.chainId.split(":")[1],
        currentWallet.address
      );

      await repay(
        currentWallet,
        selectedAsset.zrc20,
        repayAmount,
        parseInt(currentWallet.chainId.split(":")[1]),
        currentWallet.address
      );

      setRepayAmount("");
      setRepayModalOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error("Repay failed:", error);
    } finally {
      setIsRepaying(false);
    }
  };

  const DotSpin = () => (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle" />
  );

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

      setIsLoading(true);

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

            setIsLoading(false);
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
            setIsLoading(false);
            return { ...r, loading: false };
          }
        })
      );

      if (!cancelled) {
        setRows(next);
        setIsLoading(false);
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
    <>
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
                {isLoading ? (
                  <div className="text-2xl font-bold text-white">
                    <DotSpin />{" "}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    ${netWorth.toFixed(2)}
                  </div>
                )}
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
                {isLoading ? (
                  <div className="text-2xl font-bold text-white">
                    <DotSpin />{" "}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    ${totalSupplyValue.toFixed(2)}
                  </div>
                )}
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
                {isLoading ? (
                  <div className="text-2xl font-bold text-white">
                    <DotSpin />{" "}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    ${totalBorrowValue.toFixed(2)}
                  </div>
                )}
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
                {isLoading ? (
                  <div className="text-2xl font-bold text-white">
                    <DotSpin />{" "}
                  </div>
                ) : (
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
                )}
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
                      {isLoading ? (
                        <div className="text-2xl font-bold text-white justify-self-center">
                          <DotSpin />{" "}
                        </div>
                      ) : (
                        <>
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
                                    <div className="text-gray-400">
                                      Supplied
                                    </div>
                                  </div>
                                  <div className="justify-self-end">
                                    <div className="text-white font-medium">
                                      {position.suppliedNum} {position.symbol}
                                    </div>
                                    <div className="text-gray-400">
                                      ${" "}
                                      {parseFloat(position.suppliedUSD).toFixed(
                                        2
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex space-x-2 mt-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                                    onClick={() => {
                                      setSelectedAsset(position);
                                      setWithdrawModalOpen(true);
                                    }}
                                  >
                                    Withdraw
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div key={position.name}></div>
                            )
                          )}
                        </>
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
                      {isLoading ? (
                        <div className="text-2xl font-bold text-white justify-self-center">
                          <DotSpin />{" "}
                        </div>
                      ) : (
                        <>
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
                                    <div className="text-gray-400">
                                      Borrowed
                                    </div>
                                  </div>
                                  <div className="justify-self-end">
                                    <div className="text-white font-medium">
                                      {position.borrowedNum} {position.symbol}
                                    </div>
                                    <div className="text-gray-400">
                                      ${" "}
                                      {parseFloat(position.borrowedUSD).toFixed(
                                        2
                                      )}
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
                                    onClick={() => {
                                      setSelectedAsset(position);
                                      setRepayModalOpen(true);
                                    }}
                                  >
                                    Repay
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div key={position.name}></div>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          {/* Withdraw Modal */}
          <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw {selectedAsset?.symbol}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Amount + Pay With */}
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-300 text-sm font-medium">
                      Amount to Withdraw
                    </label>
                    <Tooltip
                      content="Choose any supported token on this chain. We automatically swap to the vault asset and withdraw.
                                        On Zeta Athens, withdraw must use the vault&rsquo;s ZRC20 token."
                    >
                      <InfoIcon className="h-3.5 w-3.5 text-gray-400" />
                    </Tooltip>
                  </div>

                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-5 lg:items-center gap-3">
                    {/* amount */}
                    <div className="relative lg:col-span-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-20"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {selectedAsset?.symbol}
                      </div>
                    </div>

                    {/* token selector */}
                    <div className="lg:col-span-2">
                      <select
                        aria-label="Pay with"
                        value={inputTokenSymbol}
                        onChange={(e) => setInputTokenSymbol(e.target.value)}
                        disabled={isZetaAthens}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-12 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70"
                      >
                        {isZetaAthens && selected ? (
                          // Show only the vault's own token on Zeta Athens
                          <option value={selected.symbol}>
                            {selected.symbol}
                          </option>
                        ) : (
                          allowedTokens.map((t) => (
                            <option key={t.symbol} value={t.symbol}>
                              {t.symbol}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-400 text-sm">
                      Available: {selectedAsset?.suppliedNum}{" "}
                      {selectedAsset?.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                      onClick={() =>
                        setWithdrawAmount(
                          selectedAsset?.suppliedNum.toString() || ""
                        )
                      }
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm font-medium">
                        Withdraw to
                      </span>
                      <Tooltip content="Advanced: Withdraw to a different address on a specific chain">
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
                        value={onBehalfChainKey}
                        onChange={(e) =>
                          setOnBehalfChainKey(e.target.value as ChainKey)
                        }
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-11 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {(Object.keys(CHAINS) as ChainKey[]).map((k) => (
                          <option key={k} value={k}>
                            {CHAINS[k].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-gray-400 text-xs mb-1 block">
                        Address on selected chain
                      </label>
                      <Input
                        placeholder={addressHint}
                        value={onBehalfAddress}
                        onChange={(e) => setOnBehalfAddress(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={
                    !withdrawAmount ||
                    Number.parseFloat(withdrawAmount) <= 0 ||
                    isWithdrawing
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  {isWithdrawing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Withdrawing...</span>
                    </div>
                  ) : (
                    `Withdraw ${selectedAsset?.symbol}`
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Repay Modal */}
          <Dialog open={repayModalOpen} onOpenChange={setRepayModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Repay {selectedAsset?.symbol}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Amount + Pay With */}
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-300 text-sm font-medium">
                      Amount to Repay
                    </label>
                    <Tooltip
                      content="Choose any supported token on this chain. We automatically swap to the vault asset and repay.
                                        On Zeta Athens, repay must use the vault&rsquo;s ZRC20 token."
                    >
                      <InfoIcon className="h-3.5 w-3.5 text-gray-400" />
                    </Tooltip>
                  </div>

                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-5 lg:items-center gap-3">
                    {/* amount */}
                    <div className="relative lg:col-span-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-20"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {selectedAsset?.symbol}
                      </div>
                    </div>

                    {/* token selector */}
                    <div className="lg:col-span-2">
                      <select
                        aria-label="Pay with"
                        value={inputTokenSymbol}
                        onChange={(e) => setInputTokenSymbol(e.target.value)}
                        disabled={isZetaAthens}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-12 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70"
                      >
                        {isZetaAthens && selected ? (
                          // Show only the vault's own token on Zeta Athens
                          <option value={selected.symbol}>
                            {selected.symbol}
                          </option>
                        ) : (
                          allowedTokens.map((t) => (
                            <option key={t.symbol} value={t.symbol}>
                              {t.symbol}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-400 text-sm">
                      Borrowed: {selectedAsset?.borrowedNum}{" "}
                      {selectedAsset?.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                      onClick={() =>
                        setRepayAmount(
                          selectedAsset?.borrowedNum.toString() || ""
                        )
                      }
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm font-medium">
                        Repay on behalf of
                      </span>
                      <Tooltip content="Advanced: Repay on behalf of any address">
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
                        value={onBehalfChainKey}
                        onChange={(e) =>
                          setOnBehalfChainKey(e.target.value as ChainKey)
                        }
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 h-11 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {(Object.keys(CHAINS) as ChainKey[]).map((k) => (
                          <option key={k} value={k}>
                            {CHAINS[k].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-gray-400 text-xs mb-1 block">
                        Address on selected chain
                      </label>
                      <Input
                        placeholder={addressHint}
                        value={onBehalfAddress}
                        onChange={(e) => setOnBehalfAddress(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleRepay}
                  disabled={
                    !repayAmount ||
                    Number.parseFloat(repayAmount) <= 0 ||
                    isRepaying
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  {isRepaying ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Repaying...</span>
                    </div>
                  ) : (
                    `Repay ${selectedAsset?.symbol}`
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}

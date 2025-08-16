// lib/rpc.ts
import { createPublicClient, http, type Abi, type WalletClient } from 'viem'
import { LENDING_POOL_ABI } from './abis'

type HexAddr = `0x${string}`

type ReadArgs = {
  rpcUrl?: string
  address?: HexAddr
  abi?: Abi
  functionName: string
  args?: readonly unknown[]
}

type WriteArgs = {
  rpcUrl?: string
  signer: WalletClient
  address?: HexAddr
  abi?: Abi
  functionName: string
  args?: readonly unknown[]
  waitForReceipt?: boolean
}

/**
 * Read a contract function on ZetaChain.
 */
export const readZetaContract = async <T = unknown>({
  rpcUrl = process.env.NEXT_PUBLIC_ZETA_RPC_URL || '',
  address = process.env.NEXT_PUBLIC_LENDING_POOL as HexAddr,
  abi = LENDING_POOL_ABI as Abi,
  functionName,
  args = [],
}: ReadArgs): Promise<T> => {
  const client = createPublicClient({ transport: http(rpcUrl) })
  return client.readContract({
    address,
    abi,
    functionName: functionName as any,
    args,
  }) as Promise<T>
}

/**
 * Write (send tx) to a contract function on ZetaChain.
 * Pass a viem WalletClient as `signer` (already configured with account & chain).
 */
export const writeZetaContract = async ({
  rpcUrl = process.env.NEXT_PUBLIC_ZETA_RPC_URL || '',
  signer,
  address = process.env.NEXT_PUBLIC_LENDING_POOL as HexAddr,
  abi = LENDING_POOL_ABI as Abi,
  functionName,
  args = [],
  waitForReceipt = true,
}: WriteArgs) => {
  const hash = await signer.writeContract({
    address,
    abi,
    functionName: functionName as any,
    args,
    account: (signer as any).account!,
    chain: (signer as any).chain ?? undefined,
  })

  if (!waitForReceipt) return { hash }

  const publicClient = createPublicClient({ transport: http(rpcUrl) })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return { hash, receipt }
}

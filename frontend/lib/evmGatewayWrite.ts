import {
  WalletClient,
  toHex,
  zeroAddress,
  parseEther,
  createPublicClient,
  http,
  TransactionReceipt,
} from 'viem'
import { EVM_GATEWAY_ABI } from './abis'

async function waitFor3Confirm({
  client,
  hash,
}: {
  client: WalletClient
  hash: `0x${string}`
}): Promise<TransactionReceipt> {
  const publicClient = createPublicClient({
    chain: client.chain!,
    transport: http(),
  })

  return await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 3,
  })
}

export async function depositAndCall({
  client,
  gateway,
  payload,
  etherAmount,
}: {
  client: WalletClient
  gateway: `0x${string}`
  payload: `0x${string}` | Uint8Array
  etherAmount: string
}) {
  const payloadHex = typeof payload === 'string' ? payload : toHex(payload)

  const hash = await client.writeContract({
    address: gateway,
    abi: EVM_GATEWAY_ABI,
    functionName: 'depositAndCall',
    args: [
      process.env.NEXT_PUBLIC_LENDING_POOL as `0x${string}`,
      payloadHex,
      {
        revertAddress: client.account?.address as `0x${string}`,
        callOnRevert: true,
        abortAddress: zeroAddress,
        revertMessage: toHex('Revert'),
        onRevertGasLimit: BigInt(100000000),
      },
    ],
    value: parseEther(etherAmount),
  })

  return await waitFor3Confirm({ client, hash })
}

export async function gatewayCall({
  client,
  gateway,
  payload,
}: {
  client: WalletClient
  gateway: `0x${string}`
  payload: `0x${string}` | Uint8Array
}) {
  const payloadHex = typeof payload === 'string' ? payload : toHex(payload)

  const hash = await client.writeContract({
    address: gateway,
    abi: EVM_GATEWAY_ABI,
    functionName: 'call',
    args: [
      process.env.NEXT_PUBLIC_LENDING_POOL as `0x${string}`,
      payloadHex,
      {
        revertAddress: client.account?.address as `0x${string}`,
        callOnRevert: true,
        abortAddress: zeroAddress,
        revertMessage: toHex('Revert'),
        onRevertGasLimit: BigInt(100000000),
      },
    ],
  })

  return await waitFor3Confirm({ client, hash })
}

import { WalletClient, toHex, zeroAddress, parseEther } from 'viem'
import { EVM_GATEWAY_ABI } from './abis'

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

  return await client.writeContract({
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
}

export async function gatewayCall({
  client,
  gateway,
  receiver,
  payload,
}: {
  client: WalletClient
  gateway: `0x${string}`
  receiver: `0x${string}`
  payload: `0x${string}` | Uint8Array
}) {
  const payloadHex = typeof payload === 'string' ? payload : toHex(payload)

  return await client.writeContract({
    address: gateway,
    abi: EVM_GATEWAY_ABI,
    functionName: 'call',
    args: [
      receiver,
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
}

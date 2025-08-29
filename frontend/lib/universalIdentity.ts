// universalIdentity.ts
import { encodeAbiParameters, keccak256, type Hex } from 'viem'

/**
 * Compute a universal user ID (same as Solidity keccak256(abi.encode(chainId, identity))).
 */
export function computeUserId(chainId: bigint | number, identity: Hex): Hex {
  const encoded = encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'bytes' }],
    [BigInt(chainId), identity]
  )
  return keccak256(encoded)
}

import {
  bytesToHex,
  createWalletClient,
  custom,
  Hex,
  isAddress,
  parseEther,
  parseUnits,
  TransactionReceipt,
  zeroAddress,
} from 'viem'
import {
  depositAndCall as evmDepositAndCall,
  gatewayCall as evmCall,
} from './evmGatewayWrite'
import { utils } from 'ethers'
import { CHAINS } from './chains'
import { baseSepolia, sepolia, zetachainAthensTestnet } from 'viem/chains'
import { readContract, writeContract } from './viem'
import { base58 } from 'ethers/lib/utils'
import { getVaultByZRC20 } from './vaults'
import { ERC20_ABI } from './abis'

async function approveIfNeeded({
  token,
  owner,
  spender,
  amount,
  walletClient,
}: {
  token: `0x${string}`
  owner: `0x${string}`
  spender: `0x${string}`
  amount: bigint
  walletClient: any
}) {
  const allowance: bigint = await readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  })

  if (allowance < amount) {
    await walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }
}

export const supply = async (
  connectedWallet: any,
  supplyVaultZrc20: string,
  nativeAmountSupplied: string,
  onBehalfOfChainId: number,
  onBehalfOfAddress: string
) => {
  const onBehalfOfHex = isAddress(onBehalfOfAddress)
    ? (onBehalfOfAddress as Hex)
    : bytesToHex(base58.decode(onBehalfOfAddress))

  const payload = utils.defaultAbiCoder.encode(
    ['string', 'bytes', 'uint256', 'address', 'address', 'uint256'],
    [
      'supply',
      onBehalfOfHex,
      onBehalfOfChainId,
      supplyVaultZrc20,
      zeroAddress,
      0,
    ]
  )

  if (connectedWallet.chainType === 'solana') {
    throw new Error('Unimplemented')
  } else {
    const provider = await connectedWallet.getEthereumProvider()
    const hexChainId = await provider.request({ method: 'eth_chainId' })
    const chainId = parseInt(hexChainId, 16)
    const walletClient = createWalletClient({
      account: connectedWallet.address as Hex,
      chain:
        chainId === CHAINS.baseSepolia.id
          ? baseSepolia
          : chainId === CHAINS.sepolia.id
          ? sepolia
          : zetachainAthensTestnet,
      transport: custom(provider),
    })

    if (chainId === CHAINS.zetaAthens.id) {
      const decimals = getVaultByZRC20(supplyVaultZrc20)!.asset.decimals
      const amount = parseUnits(nativeAmountSupplied, decimals) // bigint

      await approveIfNeeded({
        token: supplyVaultZrc20 as `0x${string}`, // the ERC20/ZRC20 you’re supplying
        owner: walletClient.account!.address as `0x${string}`,
        spender: process.env.NEXT_PUBLIC_LENDING_POOL as `0x${string}`,
        amount,
        walletClient,
      })

      const { receipt } = await writeContract({
        signer: walletClient,
        functionName: 'supply',
        args: [
          supplyVaultZrc20,
          amount,
          { chainId: onBehalfOfChainId, identity: onBehalfOfHex },
        ],
      })
      return receipt as TransactionReceipt
    } else {
      return evmDepositAndCall({
        client: walletClient,
        gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
        payload: payload as `0x${string}`,
        etherAmount: nativeAmountSupplied,
      })
    }
  }
}

export const borrow = async (
  connectedWallet: any,
  borrowVaultZrc20: string,
  vaultAmountBorrowed: bigint,
  borrowTokenAddress: string,
  onAddress: string,
  onAddressChainid: number
) => {
  const onBehalfOfHex = isAddress(onAddress)
    ? (onAddress as Hex)
    : bytesToHex(base58.decode(onAddress))

  const payload = utils.defaultAbiCoder.encode(
    ['string', 'bytes', 'uint256', 'address', 'address', 'uint256'],
    [
      'borrow',
      onBehalfOfHex,
      onAddressChainid, // withdraw chainId - automatically decided based on borrowTokenAddress
      borrowVaultZrc20,
      borrowTokenAddress,
      vaultAmountBorrowed,
    ]
  )

  if (connectedWallet.chainType === 'solana') {
    throw new Error('Unimplemented')
  } else {
    const provider = await connectedWallet.getEthereumProvider()
    const hexChainId = await provider.request({ method: 'eth_chainId' })
    const chainId = parseInt(hexChainId, 16)
    const walletClient = createWalletClient({
      account: connectedWallet.address as Hex,
      chain:
        chainId === CHAINS.baseSepolia.id
          ? baseSepolia
          : chainId === CHAINS.sepolia.id
          ? sepolia
          : zetachainAthensTestnet,
      transport: custom(provider),
    })

    if (chainId === CHAINS.zetaAthens.id) {
      const { receipt } = await writeContract({
        signer: walletClient,
        functionName: 'borrow',
        args: [
          borrowVaultZrc20,
          vaultAmountBorrowed,
          { chainId: onAddressChainid, identity: onBehalfOfHex },
        ],
      })
      return receipt as TransactionReceipt
    } else {
      return evmCall({
        client: walletClient,
        gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
        payload: payload as `0x${string}`,
      })
    }
  }
}

import { createWalletClient, custom, Hex, parseEther, zeroAddress } from 'viem'
import {
  depositAndCall as evmDepositAndCall,
  gatewayCall as evmCall,
} from './evmGatewayWrite'
import { utils } from 'ethers'
import { CHAINS } from './chains'
import { baseSepolia, sepolia, zetachainAthensTestnet } from 'viem/chains'

export const supply = async (
  connectedWallet: any,
  supplyVaultZrc20: string,
  nativeAmountSupplied: string,
  onBehalfOfChainId: number,
  onBehalfOfAddress: string
) => {
  const payload = utils.defaultAbiCoder.encode(
    ['string', 'bytes', 'uint256', 'address', 'address', 'uint256'],
    [
      'supply',
      onBehalfOfAddress,
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
      throw new Error('Unimplemented')
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
  vaultAmountBorrowed: string,
  borrowTokenAddress: string,
  onAddress: string
) => {
  const payload = utils.defaultAbiCoder.encode(
    ['string', 'bytes', 'uint256', 'address', 'address', 'uint256'],
    [
      'borrow',
      onAddress,
      zeroAddress, // withdraw chainId - automatically decided based on borrowTokenAddress
      borrowVaultZrc20,
      borrowTokenAddress,
      parseEther(vaultAmountBorrowed), // TODO: Might need to change this acc to vault asset decimals
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
      throw new Error('Unimplemented')
    } else {
      return evmCall({
        client: walletClient,
        gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
        payload: payload as `0x${string}`,
      })
    }
  }
}

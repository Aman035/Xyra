import dotenv from 'dotenv'
import { ethers } from 'ethers'
import readlineSync from 'readline-sync'

import { callContract, depositAndCallContract } from './evm.ts'
import { extractTxHash } from './helper.ts'
import { getTxStatus } from './cctx.ts'

dotenv.config()

const ZERO_ADDRESS = ethers.constants.AddressZero
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || ''

const ASSET_VAULT = {
  ETH: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0', // same as sepolia
  USDC: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d', // same as sepolia
  SOL: '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501', // same as solana devnet
}

// Use const assertion to define CHAIN object with literal types
const CHAIN = {
  sepolia: 'sepolia',
  base: 'base',
  solana: 'solana',
} as const

// Use a union type for chain values
type Chain = keyof typeof CHAIN

// Define the mapping from chain to its configuration
const chainMapping: Record<
  Chain,
  { chainId: string; rpcUrl: string; privateKey: string; tokens: string[] }
> = {
  sepolia: {
    chainId: '11155111',
    rpcUrl: process.env.SEPOLIA_RPC_URL || '',
    privateKey: process.env.SEPOLIA_PRIVATE_KEY || '',
    tokens: [
      '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0', // ETH
      '0xcC683A782f4B30c138787CB5576a86AF66fdc31d', // USDC
    ],
  },
  base: {
    chainId: '84532',
    rpcUrl: process.env.BASE_RPC_URL || '',
    privateKey: process.env.BASE_PRIVATE_KEY || '',
    tokens: [
      '0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD', // ETH
      '0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19', // USDC
    ],
  },
  solana: {
    chainId: '',
    rpcUrl: process.env.SOLANA_RPC_URL || '',
    privateKey: process.env.SOLANA_PRIVATE_KEY || '',
    tokens: [
      '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501', // SOL
      '0xD10932EB3616a937bd4a2652c87E9FeBbAce53e5', // USDC
    ],
  },
}

// Function to prompt and validate user input for function choice
const getValidFunctionChoice = (): string => {
  const validFunctions = ['supply', 'withdraw', 'borrow', 'repay']
  let fn: string

  while (true) {
    fn = readlineSync
      .question(`Choose a function ${validFunctions} : `)
      .toLowerCase()

    if (validFunctions.includes(fn)) {
      return fn
    } else {
      console.log('Invalid function choice.')
    }
  }
}

// Function to prompt and validate user input for chain choice
const getValidChainChoice = (): Chain => {
  const validChains: string[] = Object.values(CHAIN)
  let chain: string

  while (true) {
    chain = readlineSync
      .question(`Choose a chain ${validChains} : `)
      .toLowerCase()

    if (validChains.includes(chain)) {
      return chain as Chain
    } else {
      console.log(
        'Invalid chain choice. Please choose one of the following: sepolia, base, solana.'
      )
    }
  }
}

// Function to call the contract based on the user's choice
const execute = async () => {
  const chain: Chain = getValidChainChoice() // Prompt and validate chain choice
  const fn = getValidFunctionChoice() // Prompt and validate function choice

  const address = new ethers.Wallet(chainMapping[chain].privateKey).address // TODO: Change this for solana

  const vaultAsset = chain === CHAIN.solana ? ASSET_VAULT.SOL : ASSET_VAULT.ETH

  let txResponse: string
  switch (fn) {
    case 'supply': {
      // Supply eth
      txResponse = depositAndCallContract(
        CONTRACT_ADDRESS,
        'string bytes uint256 address address uint256',
        `${fn} ${address} ${chainMapping[chain].chainId} ${vaultAsset} ${ZERO_ADDRESS} 0`,
        '0.1',
        chainMapping[chain].privateKey,
        chainMapping[chain].rpcUrl,
        chainMapping[chain].chainId
      )
      break
    }
    case 'borrow': {
      // Borrow USDC on Base via eth
      // Note - Address must have supplied for this to work
      // ChainId can be anything here - zeta based on withdraw assets automatically decides the chain
      txResponse = callContract(
        CONTRACT_ADDRESS,
        'string bytes uint256 address address uint256',
        `${fn} ${address} 0 ${vaultAsset} ${chainMapping['base'].tokens[0]} 10000000000000000`,
        chainMapping[chain].privateKey,
        chainMapping[chain].rpcUrl,
        chainMapping[chain].chainId
      )
      break
    }
    case 'repay': {
      // Repay debt via eth
      txResponse = depositAndCallContract(
        CONTRACT_ADDRESS,
        'string bytes uint256 address address uint256',
        `${fn} ${address} ${chainMapping[chain].chainId} ${vaultAsset} ${ZERO_ADDRESS} 0`,
        '0.001',
        chainMapping[chain].privateKey,
        chainMapping[chain].rpcUrl,
        chainMapping[chain].chainId
      )
      break
    }
    case 'withdraw': {
      // Withdraw usdc on base
      // Note - Address must have supplied for this to work
      // ChainId can be anything here - zeta based on withdraw assets automatically decides the chain
      txResponse = callContract(
        CONTRACT_ADDRESS,
        'string bytes uint256 address address uint256',
        `${fn} ${address} 0 ${vaultAsset} ${chainMapping['base'].tokens[1]} 1000000000000000`, // amount is acc to vaultAsset
        chainMapping[chain].privateKey,
        chainMapping[chain].rpcUrl,
        chainMapping[chain].chainId
      )
      break
    }
    default: {
      throw new Error('Invalid Fn')
    }
  }

  const txHash = extractTxHash(txResponse)
  getTxStatus(txHash)
}

execute()

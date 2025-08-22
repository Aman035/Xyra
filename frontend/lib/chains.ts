import { ASSETS } from '@/lib/assets'

export enum VM {
  EVM,
  SVM,
}

export type Chain = {
  id: number
  vm: VM
  label: string
  /** Assets supported on this chain */
  tokens: {
    asset: (typeof ASSETS)[keyof typeof ASSETS]
    zrcTokenAddress: string
    address?: string
  }[]
  gateway: string
}

export const CHAINS: Record<
  'sepolia' | 'baseSepolia' | 'solDevnet' | 'zetaAthens',
  Chain
> = {
  sepolia: {
    id: 11155111,
    vm: VM.EVM,
    label: 'Sepolia',
    tokens: [
      {
        asset: ASSETS.ETH,
        zrcTokenAddress: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0',
      },
      // {
      //   asset: ASSETS.USDC,
      //   zrcTokenAddress: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d',
      //   address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      // },
    ],
    gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
  },

  baseSepolia: {
    id: 84532,
    vm: VM.EVM,
    label: 'Base Sepolia',
    tokens: [
      {
        asset: ASSETS.ETH,
        zrcTokenAddress: '0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD',
      },
      // {
      //   asset: ASSETS.USDC,
      //   zrcTokenAddress: '0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19',
      //   address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      // },
    ],
    gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
  },

  solDevnet: {
    id: 0, // dummy id for Solana Devnet
    vm: VM.SVM,
    label: 'Solana Devnet',
    tokens: [
      {
        asset: ASSETS.SOL,
        zrcTokenAddress: '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501',
      },
      // {
      //   asset: ASSETS.USDC,
      //   zrcTokenAddress: '0xD10932EB3616a937bd4a2652c87E9FeBbAce53e5',
      //   address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      // },
    ],
    gateway: 'ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis',
  },
  zetaAthens: {
    id: 7001,
    vm: VM.EVM,
    label: 'Zeta Athens',
    tokens: [],
    gateway: '',
  },
} as const

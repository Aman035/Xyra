// lib/chains.ts

/** EVM testnets you support */
export const EVM_CHAINS = {
  sepolia: { id: 11155111, name: 'Sepolia' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
} as const

export const ALLOWED_EVM_IDS = new Set<number>([
  EVM_CHAINS.sepolia.id,
  EVM_CHAINS.baseSepolia.id,
])

export function labelForChainId(id: number) {
  switch (id) {
    case EVM_CHAINS.sepolia.id:
      return EVM_CHAINS.sepolia.name
    case EVM_CHAINS.baseSepolia.id:
      return EVM_CHAINS.baseSepolia.name
    default:
      return `Chain ${id}`
  }
}

/** Solana cluster label you use */
export const SOLANA_CLUSTER_LABEL = 'Solana Devnet'

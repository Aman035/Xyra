'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { sepolia, baseSepolia, zetachain } from 'viem/chains'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmea79le400znl40cg56hheit"
      clientId="client-WY6PnvtUDsEgEzh7pnGdgeCeZwo3uk6mXRhUCCGynGBG1"
      config={{
        appearance: {
          theme: 'dark',
          walletChainType: 'ethereum-and-solana', // show both EVM + Solana
        },
        // EVM networks: set default and allow-list
        defaultChain: sepolia,
        supportedChains: [sepolia, baseSepolia, zetachain],
        // Solana networks: allow-list (use your own RPC if you have one)
        solanaClusters: [
          { name: 'devnet', rpcUrl: 'https://api.devnet.solana.com' },
        ],
        // external Solana wallets:
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      {children}
    </PrivyProvider>
  )
}

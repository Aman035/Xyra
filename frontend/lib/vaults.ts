import { ASSETS } from './assets'

/** Fixed set of vaults keyed by asset symbol */
export const VAULTS = {
  ETH: {
    asset: ASSETS.ETH,
    zrc20TokenAddress: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0',
    vaultAddress: '0xFb35fa434d4313DA927ca66c24607F6D99cCFBc9',
    metadata: 'ETH Vault on Zetachain (Uses sETH.SEPOLIA)',
  },
  SOL: {
    asset: ASSETS.SOL,
    zrc20TokenAddress: '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501',
    vaultAddress: '0xc5D3192F1CfDbEB72386BD9861FBD8e488b55E20',
    metadata: 'SOL Vault on Zetachain (Uses SOL.SOLANA)',
  },
  USDC: {
    asset: ASSETS.USDC,
    zrc20TokenAddress: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d',
    vaultAddress: '0x97B72F8A6832eE2e4DCAD50dA6eD086af6de9F3a',
    metadata: 'USDC Vault on Zetachain (Uses USDC.SEPOLIA)',
  },
} as const

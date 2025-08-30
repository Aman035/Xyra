import { ASSETS } from './assets'

/** Fixed set of vaults keyed by asset symbol */
export const VAULTS = {
  ETH: {
    asset: ASSETS.ETH,
    zrc20TokenAddress: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0',
    vaultAddress: '0x4e96A2bbd8e408ECC113b559D39b35E7c3B649ce',
    metadata: 'ETH Vault on Zetachain (Uses sETH.SEPOLIA)',
    decimals: 18,
  },
  SOL: {
    asset: ASSETS.SOL,
    zrc20TokenAddress: '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501',
    vaultAddress: '0x6E0Ad6CAEfE26168253729e2e3B316877d37a7aa',
    metadata: 'SOL Vault on Zetachain (Uses SOL.SOLANA)',
    decimals: 9,
  },
  USDC: {
    asset: ASSETS.USDC,
    zrc20TokenAddress: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d',
    vaultAddress: '0xAf59c82bF11Fa1a582a792c0e267f4bE0C364F13',
    metadata: 'USDC Vault on Zetachain (Uses USDC.SEPOLIA)',
    decimals: 6,
  },
} as const

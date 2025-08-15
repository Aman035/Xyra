import { ASSETS } from './assets'

/** Fixed set of vaults keyed by asset symbol */
export const VAULTS = {
  ETH: {
    asset: ASSETS.ETH,
    zrc20TokenAddress: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO
    metadata: 'ETH Vault on Zetachain (Uses sETH.SEPOLIA)',
  },
  SOL: {
    asset: ASSETS.SOL,
    zrc20TokenAddress: '0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO
    metadata: 'SOL Vault on Zetachain (Uses SOL.SOLANA)',
  },
  USDC: {
    asset: ASSETS.USDC,
    zrc20TokenAddress: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d',
    vaultAddress: '0x0000000000000000000000000000000000000000', // TODO
    metadata: 'USDC Vault on Zetachain (Uses USDC.SEPOLIA)',
  },
} as const

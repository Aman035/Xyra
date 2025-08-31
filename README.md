# Xyra

**Xyra** is a **universal cross-chain lending protocol** built on [ZetaChain](https://www.zetachain.com/).
It unifies liquidity across multiple blockchains, enabling seamless supply, borrow, repay, and withdraw actions from any chain to any chain.

---

## 🌐 Overview

### Why Xyra?

Traditional lending protocols are siloed per chain - liquidity on Ethereum, Solana, or Base cannot easily interact. Xyra.Fi leverages ZetaChain’s **universal smart contracts** to unify liquidity, letting users supply and borrow across chains without bridging or manual swaps.
![Home](./docs/home.png)
![Supply](./docs/supply.png)
![Borrow](./docs/borrow.png)
![Withdraw](./docs/withdraw.png)
![Repay](./docs/repay.png)
![Portfolio](./docs/portfolio.png)

---

## 🏗️ Project Structure

```
Xyra/
├── contracts/                  # Solidity smart contracts
│   ├── src/                    # Protocol source code
│   │   ├── pool/               # LendingPool, PoolManager
│   │   ├── vaults/             # ERC4626 reserves
│   │   ├── interestRate/       # Interest rate logic
│   │   ├── liquidation/        # Liquidation mechanisms
│   │   ├── oracle/             # Price oracles
│   │   ├── swap/               # Cross-chain swap integration via Uni V2
│   │   ├── accessControl/      # Role & access control
│   │   ├── collateral/         # Collateral management
│   │   └── protocol/           # Base + Universal contracts
│   ├── script/                 # Deployment & setup scripts
│   └── test/                   # Foundry unit tests
│
├── e2e/                        # End-to-end cross-chain tests
│   └── src/                    # Scripts for testing cross-chain calls
│
├── frontend/                   # Next.js frontend app
│   ├── app/                    # Pages (home, supply, borrow, portfolio)
│   ├── lib/                    # Chain configs, ABIs, utilities, Zeta Gateway Interaction
│   └── components/             # Reusable UI components
│
└── README.md                   # Project documentation

```

---

## ✨ Features

- **Supply to Vaults**

  - Supply liquidity from **Ethereum Sepolia**, **Base Sepolia**, **Zeta Athens**, or **Solana Devnet**.
  - Supply can be done **on behalf of another address**.
  - If the supplied asset differs from the vault’s reserve asset, it is **automatically swapped**.

- **Borrow Across Chains**

  - Borrow from vaults to any chain and any address.
  - Assets are **swapped internally** if the borrowed asset differs from the vault’s underlying.

- **Withdraw Anywhere**

  - Withdraw supplied liquidity to a specific chain and address.
  - Withdrawals also support cross-asset swaps.

- **Repay Flexibly**

  - Repay borrowed positions from **any chain**, **any asset**, and even **on behalf of another address**.

---

## How It Works

### Supply

```mermaid
sequenceDiagram
    autonumber
    participant U as User Wallet (External Chain)
    participant ASSET as Source Asset (ERC20/SPL)
    participant GW as External Gateway (EVM/Solana)
    participant LP as LendingPool (ZetaChain • Universal)
    participant DEX as DEX/Aggregator (Zeta)
    participant VAULT as Target Vault (ERC4626Reserve on Zeta)
    participant ID as UniversalIdentityLib
    participant IR as InterestRateManager
    participant OR as PriceOracle
    participant CM as CollateralManager

    Note over U,GW: Params: fromChain, fromAsset, amount,<br/>toVault (ETH/SOL/USDC...), onBehalfOf(Chain, Address)
    Note over VAULT: Vault asset = vault ZRC20 (e.g., ETH/SOL/USDC as ZRC20)

    rect rgb(245,245,245)
      Note over ASSET: (EVM) ERC20 approve may be required
      U->>ASSET: (1) approve()  ⟵ if ERC20
    end


    U->>GW: (2) depositAndCall(supply,fromAsset, toVault, amount, onBehalfOf(Chain, Address))

    GW-->>LP: (3) CCTX to ZetaChain + credit incoming ZRC20 equivalent

    LP->>ID: (4) map(onBehalfOf) → universal identity
    LP-->>LP: (5) validate params & basic health checks

    alt fromAsset (ZRC20) ≠ vaultAsset (ZRC20)
      LP->>DEX: (6) swap fromAsset.ZRC20 → vaultAsset.ZRC20
      DEX-->>LP: (7) receive vaultAsset.ZRC20
    else already correct asset
      LP-->>LP: (6) skip swap
    end

    LP->>VAULT: (8) deposit(vaultAsset.ZRC20, amount)
    VAULT-->>LP: (9) mint xERC20 to onBehalfOf

    par Post-accounting
      LP->>IR: (10) update utilization/interest
      LP->>OR: (11) record spot/price snapshot
      LP->>CM: (12) refresh collateral/LTV state
    end

    LP-->>U: (13) success: xERC20 credited to onBehalfOf (cross-chain supply finalized)

```

## Borrow

```mermaid
sequenceDiagram
    autonumber
    participant U as User Wallet (External Chain)
    participant GW as External Gateway (EVM/Solana)
    participant LP as LendingPool (ZetaChain • Universal)
    participant VAULT as Source Vault (ERC4626Reserve on Zeta)
    participant DEX as DEX/Aggregator (Zeta)
    participant IR as InterestRateManager
    participant OR as PriceOracle
    participant CM as CollateralManager
    participant OUT as Outbound Gateway (to Target Chain)

    Note over U,GW: Params: fromChain, fromVault, amount, borrowAsset, deliverTo(Chain, Address)
    Note over VAULT: Vault asset = vault ZRC20 (e.g., ETH/SOL/USDC as ZRC20)

    U->>GW: (1) call(borrow, fromVault, amount, borrowAsset, deliverTo)

    GW-->>LP: (2) CCTX delivery to LendingPool (Zeta)

    LP-->>LP: (3) validate collateral & health factor, max borrowable

    LP->>VAULT: (4) withdraw/redeem(vaultAsset.ZRC20, amount)
    VAULT-->>LP: (5) send vaultAsset.ZRC20 to LP

    alt borrowAsset (ZRC20) ≠ vaultAsset (ZRC20)
      LP->>DEX: (6) swap vaultAsset.ZRC20 → borrowAsset.ZRC20
      DEX-->>LP: (7) receive borrowAsset.ZRC20
    else already correct asset
      LP-->>LP: (6) skip swap
    end

    LP->>OUT: (8) outbound transfer to deliverTo(Chain, Address)
    OUT-->>U: (9) asset delivered on target chain/address

    par Post-accounting
      LP->>IR: (10) accrue interest & update utilization
      LP->>OR: (11) record price snapshot for health checks
      LP->>CM: (12) update borrower debt & health factor
    end

    LP-->>U: (13) success: borrow finalized, debt recorded
```

---

---

## 🚀 Deployments

### 🌐 Frontend

The Xyra frontend is live on Vercel:  
👉 [https://xyra-sigma.vercel.app/](https://xyra-sigma.vercel.app/)

### ⛓️ Contracts (ZetaChain Testnet)

- **LendingPool (Main)**  
  [`0x3e89A980F8f160228Bc37E2f95ceF2c8d5e443b2`](https://athens.explorer.zetachain.com/address/0x3e89A980F8f160228Bc37E2f95ceF2c8d5e443b2)

- AccessControlManager  
  [`0x01335A08Fd2de2F57794E9DC081a11936F139DC1`](https://athens.explorer.zetachain.com/address/0x01335A08Fd2de2F57794E9DC081a11936F139DC1)

- PriceOracle  
  [`0xDd33f3F29f1D41FF7E82ce4bb861051DAE0a7e5E`](https://athens.explorer.zetachain.com/address/0xDd33f3F29f1D41FF7E82ce4bb861051DAE0a7e5E)

- InterestRateManager  
  [`0xe64e99D90a702d5F40b80730A8beE7F0B1c21186`](https://athens.explorer.zetachain.com/address/0xe64e99D90a702d5F40b80730A8beE7F0B1c21186)

- CollateralManager  
  [`0xa2A7B313Cc506c8D8887FCAbEbd58E4d1BE567Fe`](https://athens.explorer.zetachain.com/address/0xa2A7B313Cc506c8D8887FCAbEbd58E4d1BE567Fe)

- PoolManager  
  [`0xf76C0491B360Ce9625226C85A70b6C6516dFf7AF`](https://athens.explorer.zetachain.com/address/0xf76C0491B360Ce9625226C85A70b6C6516dFf7AF)

- Swap  
  [`0xDaC125f9350cD25786Cfd5c8eb2b6837c5e7Ce6B`](https://athens.explorer.zetachain.com/address/0xDaC125f9350cD25786Cfd5c8eb2b6837c5e7Ce6B)

---

## 📊 Supported Networks

| Action             | Sepolia | Base Sepolia | Zeta Athens | Solana Devnet |
| ------------------ | ------- | ------------ | ----------- | ------------- |
| Wallet Connections | ✅      | ✅           | ✅          | ✅            |
| Interact via       | ✅      | ✅           | ✅          | Coming Soon   |
| Supply             | ✅      | ✅           | ✅          | ✅            |
| Borrow             | ✅      | ✅           | ✅          | ✅            |
| Withdraw           | ✅      | ✅           | ✅          | ✅            |
| Repay              | ✅      | ✅           | ✅          | ✅            |

---

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) for smart contracts
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/) for frontend
- [Zeta Universal CLI](https://www.zetachain.com/docs) for cross-chain calls and running E2E Test cases
- Setup `.env` as required by each subdir

### Contracts

```bash
cd contracts
forge install
forge build
forge test
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### E2E Tests

```bash
cd e2e
npm install
npm test
```

## 👥 Contributors

Made with ❤️ by

- [@Aman035](https://github.com/Aman035)
- [@0xnilesh](https://github.com/0xnilesh)

for the **ZetaChain × Google Cloud AI Buildathon** 🚀
